"""Time zone, daylight-saving and trading-session logic.

All timestamps in the project are integer epoch seconds.  Bars exported from
MT5 are stamped in *broker server time*; sessions are defined in the local time
of each financial centre, so the conversion chain is

    server time --(broker tz model)--> UTC --(US / EU DST rules)--> local session

The MQL5 file ``Include/TimeUtils.mqh`` implements exactly the same rules.
DST changes are applied at date granularity (the hour of the switch is not
modelled), which only affects a few hours per year.
"""
from __future__ import annotations

import datetime as _dt
from functools import lru_cache

import numpy as np

DAY = 86400
_EPOCH_ORD = _dt.date(1970, 1, 1).toordinal()


def _days(y: int, m: int, d: int) -> int:
    return _dt.date(y, m, d).toordinal() - _EPOCH_ORD


def _dow(days: int) -> int:
    """0 = Sunday ... 6 = Saturday (same convention as MQL5 day_of_week)."""
    return (days + 4) % 7


def _nth_sunday(y: int, m: int, n: int) -> int:
    d1 = _days(y, m, 1)
    first = d1 + (7 - _dow(d1)) % 7
    return first + 7 * (n - 1)


def _last_sunday(y: int, m: int) -> int:
    nxt = _days(y + (m == 12), m % 12 + 1, 1)
    last = nxt - 1
    return last - _dow(last)


@lru_cache(maxsize=None)
def us_dst_range(year: int) -> tuple[int, int]:
    """[start, end) in days since epoch: 2nd Sunday of March -> 1st Sunday of November."""
    return _nth_sunday(year, 3, 2), _nth_sunday(year, 11, 1)


@lru_cache(maxsize=None)
def eu_dst_range(year: int) -> tuple[int, int]:
    """[start, end): last Sunday of March -> last Sunday of October."""
    return _last_sunday(year, 3), _last_sunday(year, 10)


def _year_of_days(days: np.ndarray) -> np.ndarray:
    return (days.astype("datetime64[D]").astype("datetime64[Y]").astype(np.int64) + 1970)


def _in_range(days: np.ndarray, fn) -> np.ndarray:
    days = np.asarray(days, dtype=np.int64)
    years = _year_of_days(days)
    out = np.zeros(days.shape, dtype=bool)
    for y in np.unique(years):
        s, e = fn(int(y))
        mask = years == y
        out[mask] = (days[mask] >= s) & (days[mask] < e)
    return out


def us_dst(t) -> np.ndarray:
    return _in_range(np.asarray(t, dtype=np.int64) // DAY, us_dst_range)


def eu_dst(t) -> np.ndarray:
    return _in_range(np.asarray(t, dtype=np.int64) // DAY, eu_dst_range)


def server_offset_seconds(t_server, model: str = "EET_US", fixed_hours: float = 2.0) -> np.ndarray:
    t = np.asarray(t_server, dtype=np.int64)
    if model == "FIXED":
        return np.full(t.shape, int(round(fixed_hours * 3600)), dtype=np.int64)
    if model == "EET_US":   # GMT+2 winter / GMT+3 while US DST is active (New-York close brokers)
        return np.where(us_dst(t), 3 * 3600, 2 * 3600).astype(np.int64)
    if model == "EET_EU":   # GMT+2 / GMT+3 following European DST
        return np.where(eu_dst(t), 3 * 3600, 2 * 3600).astype(np.int64)
    raise ValueError(f"unknown server tz model {model}")


def server_to_utc(t_server, model: str = "EET_US", fixed_hours: float = 2.0) -> np.ndarray:
    t = np.asarray(t_server, dtype=np.int64)
    return t - server_offset_seconds(t, model, fixed_hours)


SESSION_ASIA, SESSION_LONDON, SESSION_NEWYORK, SESSION_OVERLAP, SESSION_OFF = range(5)
SESSION_NAMES = ["ASIA", "LONDON", "NEWYORK", "OVERLAP", "OFF"]


def session_of_utc(t_utc) -> np.ndarray:
    """Session code for UTC timestamps.

    ASIA     00:00-08:00 UTC (Tokyo 09:00-17:00, no DST)
    LONDON   08:00-16:30 London local time
    NEWYORK  08:00-17:00 New-York local time
    OVERLAP  London and New-York both open (highest priority)
    """
    t = np.asarray(t_utc, dtype=np.int64)
    mod = (t % DAY) // 60
    lon_off = np.where(eu_dst(t), 60, 0)          # minutes ahead of UTC
    ny_off = np.where(us_dst(t), -240, -300)
    lon_open, lon_close = 480 - lon_off, 990 - lon_off
    ny_open, ny_close = 480 - ny_off, 1020 - ny_off
    in_lon = (mod >= lon_open) & (mod < lon_close)
    in_ny = (mod >= ny_open) & (mod < ny_close)
    in_asia = mod < 480
    out = np.full(t.shape, SESSION_OFF, dtype=np.int64)
    out[in_asia] = SESSION_ASIA
    out[in_ny] = SESSION_NEWYORK
    out[in_lon] = SESSION_LONDON
    out[in_lon & in_ny] = SESSION_OVERLAP
    return out


def weekday_utc(t_utc) -> np.ndarray:
    """0 = Sunday ... 6 = Saturday."""
    return (np.asarray(t_utc, dtype=np.int64) // DAY + 4) % 7
