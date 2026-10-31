"""Multi-timeframe feature engine.

Decision rows are indexed by the last *closed* M5 bar ``i``; the decision time
is ``T = time_m5[i] + 300`` (the open of the next M5 bar, when the EA wakes up).
For every other timeframe we use the last bar whose close time is <= T, which
is exactly ``shift 1`` in MQL5 -- no look-ahead.
Mirror: Include/Features.mqh.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import indicators as ind
from .config import Config
from .data import TF_SECONDS
from .structure import compute_structure
from .timeutils import server_to_utc, session_of_utc, weekday_utc

HTF = ["M5", "M15", "M30", "H1", "H4"]


def compute_tf(df: pd.DataFrame, cfg: Config, full: bool = True) -> dict:
    o, h, l, c = (df[k].to_numpy(float) for k in ("open", "high", "low", "close"))
    v = df["tick_volume"].to_numpy(float)
    f = {"time": df["time"].to_numpy(np.int64), "o": o, "h": h, "l": l, "c": c, "v": v,
         "spread": df["spread"].to_numpy(float)}
    f["ema20"] = ind.ema(c, 20)
    if not full:
        return f
    for n in (9, 50, 100, 200):
        f[f"ema{n}"] = ind.ema(c, n)
    f["rsi"] = ind.rsi(c, 14)
    f["macd"], f["macd_sig"], f["hist"] = ind.macd(c)
    f["hist_prev"] = ind.shift(f["hist"], 1)
    f["atr"] = ind.atr(h, l, c, 14)
    f["atr_sma100"] = ind.sma(f["atr"], 100)
    f["adx"], f["pdi"], f["mdi"] = ind.adx(h, l, c, 14)
    f["bb_mid"], f["bb_up"], f["bb_lo"] = ind.bollinger(c, 20, 2.0)
    with np.errstate(divide="ignore", invalid="ignore"):
        f["bw"] = (f["bb_up"] - f["bb_lo"]) / f["bb_mid"]
    f["bw_sma100"] = ind.sma(np.nan_to_num(f["bw"], nan=0.0), 100)
    f["bw_sma100"][: 19 + 99] = np.nan
    f["vol_sma20"] = ind.sma(v, 20)
    f["donch_hi"] = ind.shift(ind.rolling_max(h, 20), 1)
    f["donch_lo"] = ind.shift(ind.rolling_min(l, 20), 1)
    f["rsi_prev"] = ind.shift(f["rsi"], 1)
    f["rsi_min10"] = ind.rolling_min(f["rsi"], 10)
    f["rsi_max10"] = ind.rolling_max(f["rsi"], 10)
    for n in (3, 5, 10):
        f[f"low{n}"] = ind.rolling_min(l, n)
        f[f"high{n}"] = ind.rolling_max(h, n)
    f["po"], f["pc"] = ind.shift(o, 1), ind.shift(c, 1)
    st = compute_structure(o, h, l, c, f["atr"], cfg.swing_depth)
    idx = np.arange(len(c))
    f.update(st)
    f["bars_since_break"] = np.where(st["break_idx"] >= 0, idx - st["break_idx"], 9999)
    f["sweep_age"] = np.where(st["sweep_idx"] >= 0, idx - st["sweep_idx"], 9999)
    f["align"] = np.where((f["ema20"] > f["ema50"]) & (f["ema50"] > f["ema200"]), 1,
                          np.where((f["ema20"] < f["ema50"]) & (f["ema50"] < f["ema200"]), -1, 0))
    return f


def build_features(data: dict, cfg: Config) -> pd.DataFrame:
    """Aligned decision frame (one row per closed M5 bar)."""
    tfs = {tf: compute_tf(data[tf], cfg, full=(tf != "M1")) for tf in HTF}
    m1 = compute_tf(data["M1"], cfg, full=False) if "M1" in data else None
    base = tfs["M5"]
    n = len(base["c"])
    T = base["time"] + 300
    cols = {"i": np.arange(n), "time": base["time"], "T": T}
    valid = np.ones(n, dtype=bool)
    for tf in HTF:
        f = tfs[tf]
        p = tf.lower()
        if tf == "M5":
            j = np.arange(n)
        else:
            j = np.searchsorted(f["time"] + TF_SECONDS[tf], T, side="right") - 1
        valid &= j >= cfg.warmup_bars
        jj = np.clip(j, 0, None)
        for k, arr in f.items():
            if k == "time":
                continue
            cols[f"{p}_{k}"] = np.asarray(arr)[jj]
        cols[f"{p}_idx"] = j
    if m1 is not None:
        j = np.searchsorted(m1["time"] + 60, T, side="right") - 1
        jj = np.clip(j, 0, None)
        for k in ("o", "c", "ema20"):
            cols[f"m1_{k}"] = m1[k][jj]
        cols["m1_ok"] = j >= 30
    else:  # no M1 data: neutral M1 (EA always has M1)
        cols["m1_o"] = base["c"]; cols["m1_c"] = base["c"]; cols["m1_ema20"] = base["c"]
        cols["m1_ok"] = np.zeros(n, dtype=bool)
    X = pd.DataFrame(cols)
    # M5 anchored VWAP (UTC day)
    utc_bar = server_to_utc(base["time"], cfg.server_tz_model, cfg.server_gmt_offset_hours)
    X["m5_vwap"] = ind.anchored_vwap(base["h"], base["l"], base["c"], base["v"], utc_bar // 86400)
    X["utc"] = server_to_utc(T, cfg.server_tz_model, cfg.server_gmt_offset_hours)
    X["session"] = session_of_utc(X["utc"].to_numpy())
    X["weekday"] = weekday_utc(X["utc"].to_numpy())
    X["server_mod"] = (T % 86400) // 60
    X["valid"] = valid & ~np.isnan(X["m5_bw_sma100"].to_numpy()) & ~np.isnan(X["h1_atr_sma100"].to_numpy())
    return X
