"""Market data loading (MT5 exports), resampling and a synthetic generator.

The synthetic generator exists ONLY to test the pipeline end-to-end.  Any
statistic computed on synthetic data says nothing about real XAUUSD
profitability.  Real research must use data exported from your broker with
``mql5/Scripts/XQAI_ExportHistory.mq5`` (see docs/BACKTESTING.md).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

TF_SECONDS = {"M1": 60, "M5": 300, "M15": 900, "M30": 1800, "H1": 3600, "H4": 14400}
COLUMNS = ["time", "open", "high", "low", "close", "tick_volume", "spread"]


def _normalise(df: pd.DataFrame) -> pd.DataFrame:
    df = df.rename(columns={c: c.strip("<>").lower() for c in df.columns})
    if "time" not in df.columns or not np.issubdtype(df["time"].dtype, np.number):
        if "date" in df.columns:                      # MT5 "Export bars" format
            ts = df["date"].astype(str) + " " + df.get("time", "00:00:00").astype(str)
            df["time"] = pd.to_datetime(ts, format="mixed").astype("int64") // 10**9
        else:
            df["time"] = pd.to_datetime(df["time"], format="mixed").astype("int64") // 10**9
    if "tickvol" in df.columns:
        df = df.rename(columns={"tickvol": "tick_volume"})
    if "tick_volume" not in df.columns:
        df["tick_volume"] = 1
    if "spread" not in df.columns:
        df["spread"] = 0
    df = df[COLUMNS].copy()
    df["time"] = df["time"].astype(np.int64)
    df = df.drop_duplicates("time").sort_values("time").reset_index(drop=True)
    return df


def load_csv(path: str | Path) -> pd.DataFrame:
    path = Path(path)
    sep = "\t" if path.read_text(errors="ignore")[:500].count("\t") > 2 else ","
    return _normalise(pd.read_csv(path, sep=sep))


def resample(m1: pd.DataFrame, tf: str) -> pd.DataFrame:
    sec = TF_SECONDS[tf]
    if sec == 60:
        return m1.copy()
    key = (m1["time"] // sec) * sec
    g = m1.groupby(key, sort=True)
    out = pd.DataFrame({
        "time": g["time"].first().index.values.astype(np.int64),
        "open": g["open"].first().values,
        "high": g["high"].max().values,
        "low": g["low"].min().values,
        "close": g["close"].last().values,
        "tick_volume": g["tick_volume"].sum().values,
        "spread": g["spread"].min().values,
    })
    return out


def load_dataset(folder: str | Path, symbol: str = "XAUUSD") -> dict[str, pd.DataFrame]:
    """Load ``<symbol>_<TF>.csv`` files; missing timeframes are resampled from M1."""
    folder = Path(folder)
    data = {}
    for tf in TF_SECONDS:
        p = folder / f"{symbol}_{tf}.csv"
        if p.exists():
            data[tf] = load_csv(p)
    if "M1" not in data and "M5" not in data:
        raise FileNotFoundError(f"no {symbol}_M1.csv or {symbol}_M5.csv in {folder}")
    base = data.get("M1")
    for tf in TF_SECONDS:
        if tf not in data:
            if base is None:
                if TF_SECONDS[tf] < 300:
                    continue
                base_df, base_tf = data["M5"], "M5"
                sec = TF_SECONDS[tf]
                key = (base_df["time"] // sec) * sec
                g = base_df.groupby(key)
                data[tf] = pd.DataFrame({"time": g["time"].first().index.values.astype(np.int64),
                                         "open": g["open"].first().values, "high": g["high"].max().values,
                                         "low": g["low"].min().values, "close": g["close"].last().values,
                                         "tick_volume": g["tick_volume"].sum().values,
                                         "spread": g["spread"].min().values})
            else:
                data[tf] = resample(base, tf)
    return data


def synthetic_m1(days: int = 260, seed: int = 1, start_price: float = 2000.0,
                 start: str = "2023-01-02") -> pd.DataFrame:
    """Regime-switching synthetic M1 gold-like series (server time, Mon-Fri only)."""
    rng = np.random.default_rng(seed)
    t0 = int(pd.Timestamp(start).timestamp())
    times = []
    for d in range(int(days * 7 / 5) + 7):
        day = t0 + d * 86400
        dow = (day // 86400 + 4) % 7
        if dow in (0, 6):
            continue
        # broker day 01:00 -> 23:55 (typical gold hours, daily break at rollover)
        times.append(day + np.arange(60, 1435) * 60)
        if len(times) >= days:
            break
    t = np.concatenate(times).astype(np.int64)
    n = len(t)
    mod = (t % 86400) // 60
    # intraday volatility profile: quiet Asia, active London, peak NY open/overlap
    season = 0.6 + 0.5 * ((mod > 540) & (mod < 1080)) + 0.6 * ((mod > 900) & (mod < 1080))
    regime_len = rng.integers(600, 4000, size=n // 600 + 2)
    reg = np.repeat(rng.integers(0, 4, size=len(regime_len)), regime_len)[:n]
    drift_sign = np.repeat(rng.choice([-1, 1], size=len(regime_len)), regime_len)[:n]
    vol = 0.00022 * season * np.choose(reg, [1.0, 1.3, 0.55, 1.9])
    drift = np.choose(reg, [0.0, 0.00004, 0.0, 0.0]) * drift_sign
    ret = np.empty(n)
    price = np.empty(n)
    p, anchor = start_price, start_price
    eps = rng.standard_t(5, size=n) / np.sqrt(5 / 3)
    for i in range(n):
        mr = -0.002 * (p - anchor) / p if reg[i] in (0, 2) else 0.0
        r = drift[i] + mr + vol[i] * eps[i]
        p *= np.exp(r)
        anchor += 0.001 * (p - anchor)
        ret[i] = r
        price[i] = p
    close = price
    open_ = np.concatenate([[start_price], close[:-1]])
    wick = np.abs(rng.normal(0, 0.6, size=n)) * vol * close
    high = np.maximum(open_, close) + wick
    low = np.minimum(open_, close) - np.abs(rng.normal(0, 0.6, size=n)) * vol * close
    tv = np.maximum(1, (40 * season * (1 + 300 * np.abs(ret)) * rng.lognormal(0, 0.3, n))).astype(np.int64)
    spread = np.clip(rng.normal(25, 5, n) * (1.6 - 0.5 * (season > 1)), 12, 120).astype(np.int64)
    df = pd.DataFrame({"time": t, "open": open_.round(2), "high": high.round(2), "low": low.round(2),
                       "close": close.round(2), "tick_volume": tv, "spread": spread})
    df["high"] = df[["open", "high", "close"]].max(axis=1)
    df["low"] = df[["open", "low", "close"]].min(axis=1)
    return df


def synthetic_dataset(days: int = 260, seed: int = 1) -> dict[str, pd.DataFrame]:
    m1 = synthetic_m1(days=days, seed=seed)
    return {tf: resample(m1, tf) for tf in TF_SECONDS}
