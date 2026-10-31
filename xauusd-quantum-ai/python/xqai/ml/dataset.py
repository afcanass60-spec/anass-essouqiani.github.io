"""Meta-labelling dataset: one sample per rule-based candidate signal.

The rule engine proposes trades; the ML model only learns *which proposals are
worth taking* (meta-labelling, Lopez de Prado 2018).  The label is the
triple-barrier outcome of the trade as the EA would place it (entry at next
bar open + spread + slippage, structural SL/TP, time barrier).  Break-even and
trailing are ignored in the label on purpose (they would make labels depend on
management parameters that are optimised separately).

Leakage controls: features use closed bars only; every sample carries its
exit time so that train/test splits can be purged and embargoed.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from ..config import STRATEGIES, Config
from ..signals import ai_features, best_candidates, subset_ev


def triple_barrier(data: dict, X: pd.DataFrame, ev: dict, cfg: Config, rows: np.ndarray, s_idx: np.ndarray,
                   d_arr: np.ndarray, max_bars: int | None = None):
    m5 = data["M5"]
    o, h, l, c = (m5[k].to_numpy(float) for k in ("open", "high", "low", "close"))
    spread = (m5["spread"].to_numpy(float) * cfg.spread_multiplier + cfg.extra_spread_points) * cfg.point
    times = m5["time"].to_numpy(np.int64)
    slip = cfg.slippage_points * cfg.point
    max_bars = max_bars or cfg.max_hold_bars
    n = len(o)
    y = np.zeros(len(rows), dtype=int)
    r_out = np.zeros(len(rows))
    exit_t = np.zeros(len(rows), dtype=np.int64)
    for k, (r, si, d) in enumerate(zip(rows, s_idx, d_arr)):
        e = ev[(STRATEGIES[si], d)]
        t0 = r + 1
        if t0 >= n:
            exit_t[k] = times[-1]
            continue
        entry = o[t0] + spread[t0] + slip if d == 1 else o[t0] - slip
        sl, tp = e["sl"][r], e["tp"][r]
        risk = (entry - sl) * d
        if risk <= 0:
            exit_t[k] = times[t0]
            r_out[k] = -1.0
            continue
        res, et = None, times[min(n - 1, t0 + max_bars)]
        for t in range(t0, min(n, t0 + max_bars)):
            if d == 1:
                if l[t] <= sl:
                    res = (sl - slip - entry) / risk; et = times[t]; break
                if h[t] >= tp:
                    res = (tp - entry) / risk; et = times[t]; break
            else:
                if h[t] + spread[t] >= sl:
                    res = (entry - sl - slip) / risk; et = times[t]; break
                if l[t] + spread[t] <= tp:
                    res = (entry - tp) / risk; et = times[t]; break
        if res is None:
            last = min(n - 1, t0 + max_bars - 1)
            res = ((c[last] - entry) * d - (spread[last] if d == -1 else 0)) / risk
        r_out[k] = res
        y[k] = int(res > 0)
        exit_t[k] = et
    return y, r_out, exit_t


def build_meta_dataset(data: dict, X: pd.DataFrame, ev: dict, cfg: Config, score_floor: float | None = None):
    """Samples = rows with a valid best candidate scoring >= score_floor (default min_score - 15)."""
    floor = cfg.min_score - 15 if score_floor is None else score_floor
    bs, bd, sc = best_candidates(X, ev, cfg)
    rows = np.where((bs >= 0) & (sc >= floor) & X["valid"].to_numpy())[0]
    F = np.zeros((len(rows), 40))
    for si, s in enumerate(STRATEGIES):
        for d in (1, -1):
            sel = np.where((bs[rows] == si) & (bd[rows] == d))[0]
            if len(sel):
                rr = rows[sel]
                F[sel] = ai_features(X.iloc[rr], subset_ev(ev, rr), s, d, cfg.point)
    y, r_out, exit_t = triple_barrier(data, X, ev, cfg, rows, bs[rows], bd[rows])
    meta = pd.DataFrame({"row": rows, "time": X["T"].to_numpy()[rows], "exit_time": exit_t,
                         "strategy": [STRATEGIES[i] for i in bs[rows]], "dir": bd[rows], "score": sc[rows],
                         "regime": ev["regime"][rows], "y": y, "r": r_out})
    return F, y, meta


def purged_walk_forward(times: np.ndarray, exit_times: np.ndarray, n_folds: int = 5, min_train_frac: float = 0.4,
                        embargo_sec: int = 86400):
    """Expanding-window splits. Training samples whose label ends after the test
    start (minus embargo) are purged; nothing after the test block is ever used."""
    order = np.argsort(times)
    t_sorted = times[order]
    n = len(times)
    start = int(n * min_train_frac)
    edges = np.linspace(start, n, n_folds + 1).astype(int)
    for k in range(n_folds):
        te = order[edges[k]:edges[k + 1]]
        if len(te) == 0:
            continue
        t_start = t_sorted[edges[k]]
        tr = order[:edges[k]]
        tr = tr[exit_times[tr] < t_start - embargo_sec]
        yield tr, te
