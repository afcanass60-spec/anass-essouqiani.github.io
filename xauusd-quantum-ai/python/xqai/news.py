"""Economic-calendar filter.

Source of truth = the MetaQuotes economic calendar built into MT5
(``CalendarValueHistory``), exported to CSV by ``mql5/Scripts/XQAI_ExportCalendar.mq5``.
Nothing is ever invented: if no calendar file is provided the backtest reports
that news filtering was NOT applied.

CSV columns: time_utc (epoch seconds or ISO), currency, importance, name
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

KEYWORDS = ["nonfarm", "non-farm", "payroll", "cpi", "consumer price", "pce", "fomc", "interest rate decision",
            "fed ", "fed chair", "powell", "unemployment", "jobless", "gdp", "federal reserve",
            "interest-rate", "fed-chair", "fed-"]
FOMC_KEYS = ["fomc", "interest rate decision", "interest-rate-decision", "fed chair", "fed-chair", "powell"]


def load_calendar(path: str | Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.columns = [c.strip().lower() for c in df.columns]
    t = df["time_utc"]
    if not np.issubdtype(t.dtype, np.number):
        t = pd.to_datetime(t, utc=True, format="mixed").astype("int64") // 10**9
    df["time_utc"] = t.astype(np.int64)
    df["name_l"] = df["name"].astype(str).str.lower()
    return df


def relevant(df: pd.DataFrame, high_only: bool = True) -> pd.DataFrame:
    m = df["currency"].astype(str).str.upper().eq("USD")
    if high_only and "importance" in df.columns:
        imp = df["importance"].astype(str).str.upper()
        key = df["name_l"].apply(lambda s: any(k in s for k in KEYWORDS))
        m &= imp.isin(["HIGH", "3"]) | key
    return df[m]


def blocked_mask(utc_times: np.ndarray, cal: pd.DataFrame | None, before_min: int, after_min: int,
                 fomc_min: int) -> np.ndarray:
    t = np.asarray(utc_times, dtype=np.int64)
    out = np.zeros(len(t), dtype=bool)
    if cal is None or cal.empty:
        return out
    ev = relevant(cal)
    is_fomc = ev["name_l"].apply(lambda s: any(k in s for k in FOMC_KEYS)).to_numpy()
    et = ev["time_utc"].to_numpy(np.int64)
    before = np.where(is_fomc, max(fomc_min, before_min), before_min) * 60
    after = np.where(is_fomc, max(fomc_min, after_min), after_min) * 60
    starts, ends = et - before, et + after
    order = np.argsort(starts)
    starts, ends = starts[order], np.maximum.accumulate(ends[order])
    k = np.searchsorted(starts, t, side="right") - 1
    ok = k >= 0
    out[ok] = t[ok] <= ends[k[ok]]
    return out
