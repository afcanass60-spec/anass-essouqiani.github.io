"""Regime detection, the six strategies, structural SL/TP and the 100-point score.

Vectorised over all decision rows.  The EA evaluates the very same rules for
one row at a time in Include/Regime.mqh, Include/Strategies.mqh and
Include/Scoring.mqh.  Every threshold here is a documented, testable
hypothesis -- not a truth -- and is subject to walk-forward validation.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .config import (COUNTER_TREND, REGIMES, SCORE_COMPONENTS, STRATEGIES, Config,
                     parse_regime_matrix)

R_TU, R_TD, R_RG, R_SQ, R_VO, R_TR = range(6)
N_FEATURES = 40


def regime(X: pd.DataFrame) -> np.ndarray:
    atr_ratio = X["h1_atr"] / X["h1_atr_sma100"]
    bw_ratio = X["m15_bw"] / X["m15_bw_sma100"]
    adx, al = X["h1_adx"], X["h1_align"]
    r = np.full(len(X), R_TR)
    r = np.where(adx < 20, R_RG, r)
    r = np.where((bw_ratio < 0.7) & (adx < 20), R_SQ, r)
    r = np.where((adx >= 25) & (al == -1), R_TD, r)
    r = np.where((adx >= 25) & (al == 1), R_TU, r)
    r = np.where(atr_ratio > 2.0, R_VO, r)
    return r.astype(int)


def _sgn(x):
    return np.sign(np.nan_to_num(x)).astype(int)


def _zone(X, d: int, p: str):
    if d == 1:
        top, bot = X[f"{p}_fvg_bull_top"], X[f"{p}_fvg_bull_bot"]
        z1 = (X[f"{p}_l"] <= top) & (X[f"{p}_c"] >= bot)
        top, bot = X[f"{p}_ob_bull_top"], X[f"{p}_ob_bull_bot"]
        z2 = (X[f"{p}_l"] <= top) & (X[f"{p}_c"] >= bot)
    else:
        top, bot = X[f"{p}_fvg_bear_top"], X[f"{p}_fvg_bear_bot"]
        z1 = (X[f"{p}_h"] >= bot) & (X[f"{p}_c"] <= top)
        top, bot = X[f"{p}_ob_bear_top"], X[f"{p}_ob_bear_bot"]
        z2 = (X[f"{p}_h"] >= bot) & (X[f"{p}_c"] <= top)
    return (z1.fillna(False) | z2.fillna(False)).to_numpy(bool)


def price_action(X: pd.DataFrame, d: int):
    o, h, l, c = (X[f"m5_{k}"].to_numpy() for k in "ohlc")
    po, pc = X["m5_po"].to_numpy(), X["m5_pc"].to_numpy()
    body, pbody, rng = np.abs(c - o), np.abs(pc - po), h - l
    with np.errstate(divide="ignore", invalid="ignore"):
        cpos = np.where(rng > 0, (c - l) / rng, 0.5)
    if d == 1:
        engulf = (c > o) & (pc < po) & (c >= po) & (o <= pc) & (body > pbody)
        wick = np.minimum(o, c) - l
        cpos_d = cpos
    else:
        engulf = (c < o) & (pc > po) & (c <= po) & (o >= pc) & (body > pbody)
        wick = h - np.maximum(o, c)
        cpos_d = 1.0 - cpos
    pin = (rng > 0) & (wick >= 2 * body) & (wick >= 0.6 * rng)
    return engulf | pin, cpos_d


def _clip01(x):
    return np.clip(x, 0.0, 1.0)


def evaluate(X: pd.DataFrame, cfg: Config) -> dict:
    """Return per (strategy, direction) arrays: valid, sl, tp, risk, rr, comps, score."""
    reg = regime(X)
    matrix = parse_regime_matrix(cfg.regime_matrix)
    w = cfg.weights()
    atr = X["m5_atr"].to_numpy()
    c = X["m5_c"].to_numpy()
    out = {}
    for d in (1, -1):
        pattern, cpos = price_action(X, d)
        bull = (X["m5_c"] - X["m5_o"]).to_numpy() * d > 0
        zone = _zone(X, d, "m5") | _zone(X, d, "m15")
        rsi = X["m5_rsi"].to_numpy()
        hist, hist_prev = X["m5_hist"].to_numpy(), X["m5_hist_prev"].to_numpy()
        vol_ratio = (X["m5_v"] / X["m5_vol_sma20"]).to_numpy()
        lowN = {n: X[f"m5_low{n}"].to_numpy() if d == 1 else X[f"m5_high{n}"].to_numpy() for n in (3, 5, 10)}
        ext = X["m5_l"].to_numpy() if d == 1 else X["m5_h"].to_numpy()
        opp15 = (X["m15_sh_last"] if d == 1 else X["m15_sl_last"]).to_numpy()
        opp1h = (X["h1_sh_last"] if d == 1 else X["h1_sl_last"]).to_numpy()
        own5 = (X["m5_sl_last"] if d == 1 else X["m5_sh_last"]).to_numpy()
        al_h1, al_h4 = X["h1_align"].to_numpy(), X["h4_align"].to_numpy()
        e15 = _sgn(X["m15_ema20"] - X["m15_ema50"])
        e30 = _sgn(X["m30_ema20"] - X["m30_ema50"])
        e200 = _sgn(X["m5_c"] - X["m5_ema200"])
        brk_d = (X["m5_break_dir"].to_numpy() == d)
        bsb = X["m5_bars_since_break"].to_numpy()
        btype = X["m5_break_type"].to_numpy()
        sweep5 = (X["m5_sweep_dir"].to_numpy() == d)
        sweep15 = (X["m15_sweep_dir"].to_numpy() == d)
        age5, age15 = X["m5_sweep_age"].to_numpy(), X["m15_sweep_age"].to_numpy()
        rsi_ext = (X["m5_rsi_min10"] if d == 1 else 100 - X["m5_rsi_max10"]).to_numpy()
        rsi_d = rsi if d == 1 else 100 - rsi       # mirrored RSI: "buy-side" view
        rsi_prev_d = X["m5_rsi_prev"].to_numpy() if d == 1 else 100 - X["m5_rsi_prev"].to_numpy()
        donch_hi, donch_lo = X["m5_donch_hi"].to_numpy(), X["m5_donch_lo"].to_numpy()
        bb_band = (X["m5_bb_lo"] if d == 1 else X["m5_bb_up"]).to_numpy()
        trend_ok = {R_TU: d == 1, R_TD: d == -1}

        for s in STRATEGIES:
            if s == "TREND_PULLBACK":
                touch = (lowN[3] - (X["m5_ema20"].to_numpy() + d * 0.2 * atr)) * d <= 0
                cond = ((touch | zone) & ((c - X["m5_ema20"].to_numpy()) * d > 0)
                        & ((c - X["m5_ema50"].to_numpy()) * d > 0)
                        & (pattern | (bull & (cpos >= 0.7))) & (rsi_d >= 40) & (rsi_d <= 70))
                sl_raw = lowN[5] - d * cfg.sl_buffer_atr * atr
                target, mode = opp15, "trend"
            elif s == "MOMENTUM":
                cond = (brk_d & (btype == 1) & (bsb == 0) & (hist * d > 0) & ((hist - hist_prev) * d > 0)
                        & (X["m15_adx"].to_numpy() > 25) & (vol_ratio >= 1.2) & (rsi_d >= 55) & (rsi_d <= 75))
                base = np.where(np.isnan(own5), lowN[5], own5)
                sl_raw = base - d * cfg.sl_buffer_atr * atr
                target, mode = opp1h, "trend"
            elif s == "BREAKOUT":
                lvl = donch_hi if d == 1 else donch_lo
                cond = (((c - lvl) * d > 0) & (vol_ratio >= 1.5) & (cpos >= 0.7) & bull
                        & ((X["m15_bw"] / X["m15_bw_sma100"]).to_numpy() < 1.2))
                sl_raw = ext - d * cfg.sl_buffer_atr * atr
                target, mode = c + d * (donch_hi - donch_lo), "trend"
            elif s == "LIQ_SWEEP":
                cond = (((sweep5 & (age5 <= 3)) | (sweep15 & (age15 == 0))) & bull & (cpos >= 0.6) & (rsi_d < 60))
                sl_raw = lowN[5] - d * cfg.sl_buffer_atr * atr
                target, mode = opp15, "target"
            elif s == "REVERSAL":
                cond = (brk_d & (btype == 2) & (bsb <= 3) & (rsi_ext < 35)
                        & ~((X["h4_adx"].to_numpy() > 30) & (al_h4 == -d)))
                sl_raw = lowN[10] - d * cfg.sl_buffer_atr * atr
                target, mode = opp15, "target"
            else:  # MEAN_REVERSION
                cond = (((lowN[3] - bb_band) * d < 0) & (np.minimum(rsi_d, rsi_prev_d) < 30)
                        & bull & (cpos >= 0.6))
                sl_raw = lowN[3] - d * (cfg.sl_buffer_atr + 0.2) * atr
                target, mode = X["m5_bb_mid"].to_numpy(), "target"

            # regime gate and direction gate
            allowed = np.zeros(len(X), dtype=bool)
            for r_id, r_name in enumerate(REGIMES):
                if s in matrix[r_name]:
                    allowed |= reg == r_id
            if s not in COUNTER_TREND:
                for r_id, ok in trend_ok.items():
                    if not ok:
                        allowed &= reg != r_id
                allowed &= ~((reg == R_TR) & (al_h4 != d))
            if s not in cfg.enabled_strategies:
                allowed[:] = False

            # stop loss: structural, clamped to [min_sl, max_sl] ATR
            risk = (c - sl_raw) * d
            risk = np.where(risk < cfg.min_sl_atr * atr, cfg.min_sl_atr * atr, risk)
            ok_sl = risk <= cfg.max_sl_atr * atr
            sl = c - d * risk
            # take profit from structure
            tdist = (target - c) * d
            has_t = ~np.isnan(tdist) & (tdist > 0)
            min_rr_s = cfg.min_rr_mean_reversion if s == "MEAN_REVERSION" else cfg.min_rr
            if mode == "trend":
                floor_rr = max(cfg.rr_target, cfg.min_rr)
                tp_far = np.minimum(np.maximum(tdist - 0.1 * atr, floor_rr * risk), cfg.max_rr * risk)
                tpd = np.where(has_t & (tdist >= min_rr_s * risk), tp_far, floor_rr * risk)
                ok_tp = ~(has_t & (tdist < 1.0 * risk))   # liquidity obstacle right ahead
            else:
                tpd = np.minimum(tdist - 0.1 * atr, cfg.max_rr * risk)
                ok_tp = has_t & (tpd >= min_rr_s * risk)
            tpd = np.nan_to_num(tpd, nan=0.0)
            tp = c + d * tpd
            valid = (cond & allowed & ok_sl & ok_tp & X["valid"].to_numpy() & (atr > 0)
                     & ~np.isnan(sl) & ~np.isnan(tp))

            # ---- score components (fractions in [0, 1]) ----
            counter = s in COUNTER_TREND
            a = (brk_d & (bsb <= 10)).astype(float)
            st15 = X["m15_struct_trend"].to_numpy()
            b = np.where(st15 != -d, 1.0, 0.3) if counter else np.where(st15 == d, 1.0, np.where(st15 == 0, 0.5, 0.0))
            cz = (zone | (sweep5 & (age5 <= 5))).astype(float)
            comp_s = 0.4 * a + 0.3 * b + 0.3 * cz

            def f(al):
                return np.where(al == d, 1.0, np.where(al == 0, 0.5, 0.0))
            if counter:
                comp_t = (1.0 - 0.5 * ((al_h1 == -d) & (X["h1_adx"].to_numpy() > 25))
                          - 0.5 * ((al_h4 == -d) & (X["h4_adx"].to_numpy() > 25)))
            else:
                comp_t = 0.35 * f(al_h1) + 0.25 * f(al_h4) + 0.2 * (e15 == d) + 0.2 * (e200 == d)

            adx15 = X["m15_adx"].to_numpy()
            slope = (hist - hist_prev) * d > 0
            if counter:
                m_rsi = np.where(rsi_ext < 35, 1.0, np.where(rsi_ext < 45, 0.5, 0.0))
                m_macd = slope.astype(float)
                m_adx = np.where(adx15 < 25, 1.0, 0.5)
            else:
                m_rsi = np.where((rsi_d >= 50) & (rsi_d <= 70), 1.0, np.where((rsi_d >= 40) & (rsi_d < 50), 0.5, 0.0))
                m_macd = np.where(hist * d > 0, 0.5 + 0.5 * slope, 0.0)
                m_adx = np.where(adx15 >= 25, 1.0, np.where(adx15 >= 20, 0.5, 0.0))
            comp_m = (m_rsi + m_macd + m_adx) / 3.0

            l_sw = np.where((sweep5 & (age5 <= 5)) | (sweep15 & (age15 <= 2)), 0.5, 0.0)
            d15, d1h = (opp15 - c) * d, (opp1h - c) * d
            d15 = np.where(np.isnan(d15) | (d15 <= 0), np.inf, d15)
            d1h = np.where(np.isnan(d1h) | (d1h <= 0), np.inf, d1h)
            room = np.minimum(d15, d1h)
            with np.errstate(divide="ignore", invalid="ignore"):
                room_r = room / risk
            l_room = np.where(np.isinf(room), 0.5, np.where(room_r >= cfg.min_rr, 0.5, np.where(room_r >= 1, 0.25, 0.0)))
            comp_l = l_sw + l_room

            with np.errstate(divide="ignore", invalid="ignore"):
                ar = X["m5_atr"].to_numpy() / X["m5_atr_sma100"].to_numpy()
                sp = X["m5_spread"].to_numpy() * cfg.point / atr
            v_ar = np.where((ar >= 0.7) & (ar <= 1.8), 0.6, np.where((ar >= 0.5) & (ar <= 2.5), 0.2, 0.0))
            v_sp = np.where(sp <= 0.1, 0.4, np.where(sp <= 0.2, 0.2, 0.0))
            comp_v = v_ar + v_sp

            comp_p = 0.6 * pattern + np.where(cpos >= 0.7, 0.4, np.where(cpos >= 0.55, 0.2, 0.0))

            m1 = (((X["m1_c"] - X["m1_o"]).to_numpy() * d > 0) & ((X["m1_c"] - X["m1_ema20"]).to_numpy() * d > 0)
                  & X["m1_ok"].to_numpy())
            mid = (np.where((e15 == d) & (e30 == d), 0.3, 0.0) if not counter
                   else np.where(X["m30_struct_trend"].to_numpy() != -d, 0.3, 0.0))
            comp_x = 0.4 * m1 + mid + 0.3 * (al_h4 != -d)

            comps = {"structure": comp_s, "trend": comp_t, "momentum": comp_m, "liquidity": comp_l,
                     "volatility": comp_v, "price_action": comp_p, "mtf": comp_x}
            comps = {k: _clip01(np.nan_to_num(v.astype(float))) for k, v in comps.items()}
            score = sum(w[k] * comps[k] for k in SCORE_COMPONENTS)
            with np.errstate(divide="ignore", invalid="ignore"):
                rr = np.where(risk > 0, tpd / risk, 0.0)
            out[(s, d)] = {"valid": valid, "sl": sl, "tp": tp, "risk": risk, "rr": rr,
                           "comps": comps, "score": score}
    out["regime"] = reg
    return out


def ai_features(X: pd.DataFrame, ev: dict, s: str, d: int, point: float = 0.01) -> np.ndarray:
    """40-feature vector (spec v1) for every row, for candidate (s, d)."""
    e = ev[(s, d)]
    n = len(X)
    F = np.zeros((n, N_FEATURES))
    for k, name in enumerate(SCORE_COMPONENTS):
        F[:, k] = e["comps"][name]
    F[:, 7 + STRATEGIES.index(s)] = 1.0
    F[:, 13] = d
    F[np.arange(n), 14 + ev["regime"]] = 1.0
    atr5, atrh1 = X["m5_atr"].to_numpy(), X["h1_atr"].to_numpy()
    with np.errstate(divide="ignore", invalid="ignore"):
        F[:, 20] = atr5 / X["m5_atr_sma100"].to_numpy()
        F[:, 21] = atrh1 / X["h1_atr_sma100"].to_numpy()
        F[:, 22] = X["m15_adx"].to_numpy() / 50.0
        F[:, 23] = X["h1_adx"].to_numpy() / 50.0
        F[:, 24] = d * (X["m5_rsi"].to_numpy() - 50.0) / 50.0
        F[:, 25] = d * X["m5_hist"].to_numpy() / atr5
        F[:, 26] = X["m15_bw"].to_numpy() / X["m15_bw_sma100"].to_numpy()
        F[:, 27] = X["m5_v"].to_numpy() / X["m5_vol_sma20"].to_numpy()
        F[:, 28] = d * (X["m5_c"].to_numpy() - X["m5_ema50"].to_numpy()) / atr5
        F[:, 29] = d * (X["m5_c"].to_numpy() - X["h1_ema200"].to_numpy()) / atrh1
        F[:, 30] = e["risk"] / atr5
        F[:, 31] = e["rr"]
    sess = X["session"].to_numpy()
    for k in range(4):
        F[:, 32 + k] = sess == k
    hour = (X["utc"].to_numpy() % 86400) / 3600.0
    F[:, 36] = np.sin(2 * np.pi * hour / 24)
    F[:, 37] = np.cos(2 * np.pi * hour / 24)
    with np.errstate(divide="ignore", invalid="ignore"):
        F[:, 38] = X["m5_spread"].to_numpy() * point / atr5
    F[:, 39] = e["score"] / 100.0
    return np.nan_to_num(F, nan=0.0, posinf=0.0, neginf=0.0)


def subset_ev(ev: dict, rows) -> dict:
    """Restrict the output of evaluate() to a subset of rows."""
    out = {}
    for k, val in ev.items():
        if k == "regime":
            out[k] = val[rows]
        else:
            out[k] = {kk: ({c: v[rows] for c, v in vv.items()} if isinstance(vv, dict) else vv[rows])
                      for kk, vv in val.items()}
    return out


def best_candidates(X: pd.DataFrame, ev: dict, cfg: Config):
    """For every row, the best valid candidate: (strategy index, direction, score); -1 if none."""
    n = len(X)
    best_s = np.full(n, -1)
    best_d = np.zeros(n, dtype=int)
    best_score = np.full(n, -1.0)
    for si, s in enumerate(STRATEGIES):
        for d in (1, -1):
            e = ev[(s, d)]
            better = e["valid"] & (e["score"] > best_score)
            best_s[better], best_d[better], best_score[better] = si, d, e["score"][better]
    return best_s, best_d, best_score
