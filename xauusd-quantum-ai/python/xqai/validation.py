"""Validation protocol: walk-forward, Monte Carlo, overfitting statistics, baselines.

References
* Bailey & Lopez de Prado (2014), "The Deflated Sharpe Ratio".
* Bailey, Borwein, Lopez de Prado & Zhu (2015), "The Probability of Backtest
  Overfitting" (CSCV).
* Pardo (2008), walk-forward efficiency.
"""
from __future__ import annotations

import itertools
import math
from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy.stats import kurtosis, norm, skew

from .backtester import run_backtest
from .config import STRATEGIES, Config
from .metrics import compute_metrics, daily_returns
from .signals import evaluate


# ------------------------------------------------------------------ objective
def robust_objective(m: dict, min_trades: int = 30) -> float:
    """What the optimisers maximise.  Not net profit: expectancy in R scaled by
    sqrt(n) (a t-statistic proxy), penalised by drawdown, with a hard
    minimum number of trades.  Reduces the bias towards lucky, rare configs."""
    n = m["trades"]
    if n < min_trades:
        return -10.0 + n / min_trades
    return m["expectancy_r"] * math.sqrt(n) - 0.05 * m["max_drawdown_pct"]


# ------------------------------------------------------------------ baselines
def baseline_ev(X: pd.DataFrame, cfg: Config, kind: str = "ema_cross", seed: int = 0) -> dict:
    """Simple reference strategies plugged into the same execution/risk engine.
    ema_cross: H1 EMA20/EMA50 cross, SL 2 ATR(M5), TP 2R.
    random   : random direction at random times (same frequency as ema_cross)."""
    n = len(X)
    diff = np.sign((X["h1_ema20"] - X["h1_ema50"]).to_numpy())
    new_h1 = np.diff(X["h1_idx"].to_numpy(), prepend=-1) != 0
    prev = np.concatenate([[0], diff[:-1]])
    cross = new_h1 & (diff != prev) & (prev != 0)
    if kind == "random":
        rng = np.random.default_rng(seed)
        k = int(cross.sum())
        cross = np.zeros(n, dtype=bool)
        cross[rng.choice(np.where(X["valid"].to_numpy())[0], size=max(k, 1), replace=False)] = True
        diff = rng.choice([-1, 1], size=n)
    atr, c = X["m5_atr"].to_numpy(), X["m5_c"].to_numpy()
    ev = {}
    zero = {k: np.zeros(n) for k in ("structure", "trend", "momentum", "liquidity", "volatility", "price_action", "mtf")}
    for s in STRATEGIES:
        for d in (1, -1):
            valid = np.zeros(n, dtype=bool)
            if s == "TREND_PULLBACK":
                valid = cross & (diff == d) & X["valid"].to_numpy()
            risk = 2.0 * atr
            ev[(s, d)] = {"valid": valid, "sl": c - d * risk, "tp": c + d * 2.0 * risk, "risk": risk,
                          "rr": np.full(n, 2.0), "comps": zero, "score": np.where(valid, 100.0, 0.0)}
    ev["regime"] = np.zeros(n, dtype=int)
    return ev


def run_baseline(data, X, cfg: Config, kind="ema_cross", **kw):
    bcfg = cfg.replace(min_score=0, ai_mode="OFF", close_on_structure_break=False, close_on_opposite_score=1e9,
                       use_partial=False, use_trailing=False, use_break_even=False, max_sl_atr=10, min_rr=2.0)
    return run_backtest(data, bcfg, X, baseline_ev(X, bcfg, kind), **kw)


# ------------------------------------------------------------------ walk-forward
@dataclass
class WFWindow:
    is_start: int
    is_end: int
    oos_end: int
    params: dict
    is_obj: float
    oos_obj: float
    oos_metrics: dict
    is_metrics: dict


def walk_forward(data, X, cfg: Config, optimiser, is_days: int = 180, oos_days: int = 60, budget: int = 40,
                 seed: int = 0):
    """Rolling walk-forward.  ``optimiser(objective, budget, seed) -> (best_params, best_value)``,
    where ``objective(params) -> float`` evaluates the IS window only."""
    t0 = int(X.loc[X["valid"], "T"].min())
    t_end = int(X["T"].max())
    windows, oos_trades = [], []
    start = t0
    k = 0
    while start + (is_days + oos_days) * 86400 <= t_end + 1:
        is_end = start + is_days * 86400
        oos_end = is_end + oos_days * 86400

        def objective(params, _s=start, _e=is_end):
            c2 = cfg.replace(**params)
            res = run_backtest(data, c2, X, evaluate(X, c2), start_time=_s, end_time=_e)
            return robust_objective(compute_metrics(res.trades, res.equity, c2.initial_balance))

        best, best_val = optimiser(objective, budget, seed + k)
        c2 = cfg.replace(**best)
        ev2 = evaluate(X, c2)
        ris = run_backtest(data, c2, X, ev2, start_time=start, end_time=is_end)
        mi = compute_metrics(ris.trades, ris.equity, c2.initial_balance)
        res = run_backtest(data, c2, X, ev2, start_time=is_end, end_time=oos_end)
        mo = compute_metrics(res.trades, res.equity, c2.initial_balance)
        windows.append(WFWindow(start, is_end, oos_end, best, best_val, robust_objective(mo, min_trades=5), mo, mi))
        if len(res.trades):
            oos_trades.append(res.trades)
        start += oos_days * 86400
        k += 1
    trades = pd.concat(oos_trades, ignore_index=True) if oos_trades else pd.DataFrame()
    # walk-forward efficiency = OOS expectancy (R/trade) / IS expectancy, averaged over windows
    is_e = np.mean([w.is_metrics["expectancy_r"] for w in windows]) if windows else 0.0
    oos_e = np.mean([w.oos_metrics["expectancy_r"] for w in windows]) if windows else 0.0
    return {"windows": windows, "oos_trades": trades,
            "wf_efficiency": float(oos_e / is_e) if is_e > 0 else float("nan")}


# ------------------------------------------------------------------ Monte Carlo
def monte_carlo(r_multiples: np.ndarray, risk_percent: float, n_paths: int = 5000, ruin_dd_pct: float = 5.0,
                skip_frac: float = 0.0, r_haircut: float = 0.0, seed: int = 0) -> dict:
    """Bootstrap of the trade sequence (with replacement) under fixed-fractional sizing.
    ``r_haircut`` subtracts R per trade (extra costs), ``skip_frac`` drops trades at random."""
    rng = np.random.default_rng(seed)
    r = np.asarray(r_multiples, float) - r_haircut
    n = len(r)
    if n == 0:
        return {}
    finals, dds = np.empty(n_paths), np.empty(n_paths)
    for k in range(n_paths):
        x = r[rng.integers(0, n, n)]
        if skip_frac > 0:
            x = x[rng.random(n) >= skip_frac]
        eq = np.cumprod(1 + x * risk_percent / 100.0)
        eq = np.concatenate([[1.0], eq])
        peak = np.maximum.accumulate(eq)
        dds[k] = np.max(1 - eq / peak)
        finals[k] = eq[-1]
    return {"median_return_pct": 100 * (np.median(finals) - 1),
            "p05_return_pct": 100 * (np.percentile(finals, 5) - 1),
            "p95_return_pct": 100 * (np.percentile(finals, 95) - 1),
            "median_max_dd_pct": 100 * np.median(dds), "p95_max_dd_pct": 100 * np.percentile(dds, 95),
            "prob_loss": float(np.mean(finals < 1.0)),
            f"prob_dd_ge_{ruin_dd_pct:g}pct": float(np.mean(dds * 100 >= ruin_dd_pct)),
            "prob_ruin_50pct": float(np.mean(dds >= 0.5))}


# ------------------------------------------------------------------ overfitting statistics
def deflated_sharpe(returns: np.ndarray, n_trials: int, sr_trials_var: float) -> float:
    """Probability that the true Sharpe > 0 after correcting for the number of trials (non-annualised SR)."""
    r = np.asarray(returns, float)
    T = len(r)
    if T < 3 or r.std() == 0:
        return 0.0
    sr = r.mean() / r.std()
    g = 0.5772156649
    N = max(n_trials, 2)
    sr0 = math.sqrt(max(sr_trials_var, 0)) * ((1 - g) * norm.ppf(1 - 1 / N) + g * norm.ppf(1 - 1 / (N * math.e)))
    g3, g4 = skew(r), kurtosis(r, fisher=False)
    den = math.sqrt(max(1e-12, 1 - g3 * sr + (g4 - 1) / 4 * sr ** 2))
    return float(norm.cdf((sr - sr0) * math.sqrt(T - 1) / den))


def pbo_cscv(perf: np.ndarray, n_blocks: int = 8) -> dict:
    """Probability of Backtest Overfitting.  perf: (T periods x N configs) returns."""
    T, N = perf.shape
    blocks = np.array_split(np.arange(T), n_blocks)
    lambdas = []
    for comb in itertools.combinations(range(n_blocks), n_blocks // 2):
        is_idx = np.concatenate([blocks[i] for i in comb])
        oos_idx = np.concatenate([blocks[i] for i in range(n_blocks) if i not in comb])
        def sr(x):
            sd = x.std(axis=0)
            return np.where(sd > 0, x.mean(axis=0) / np.where(sd > 0, sd, 1), 0)
        best = int(np.argmax(sr(perf[is_idx])))
        oos_sr = sr(perf[oos_idx])
        rank = (oos_sr < oos_sr[best]).sum() + 0.5 * ((oos_sr == oos_sr[best]).sum() - 1)
        w = (rank + 0.5) / N
        lambdas.append(math.log(w / (1 - w)))
    lambdas = np.array(lambdas)
    return {"pbo": float(np.mean(lambdas <= 0)), "n_combinations": len(lambdas), "lambda_median": float(np.median(lambdas))}


def daily_return_matrix(results: list) -> np.ndarray:
    series = [daily_returns(r.equity) for r in results]
    df = pd.concat(series, axis=1).fillna(0.0)
    return df.to_numpy()
