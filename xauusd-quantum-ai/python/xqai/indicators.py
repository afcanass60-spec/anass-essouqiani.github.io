"""Indicator formulas shared bit-for-bit (up to float rounding) with Include/Indicators.mqh.

Conventions (important for Python <-> MQL5 parity):
* every recursive average is seeded with the first value of its input series;
* Wilder smoothing is an EMA with alpha = 1/n;
* Bollinger uses the population standard deviation (as MT5 does);
* windows that are not yet full return NaN.
The EA recomputes indicators over a fixed window (default 1000 bars), so the
seed influence is < 1e-4 relative for EMA200 and negligible for the rest.
"""
from __future__ import annotations

import numpy as np
from scipy.signal import lfilter


def ema_alpha(x: np.ndarray, alpha: float) -> np.ndarray:
    x = np.asarray(x, dtype=float)
    if len(x) == 0:
        return x.copy()
    y, _ = lfilter([alpha], [1.0, -(1.0 - alpha)], x, zi=[(1.0 - alpha) * x[0]])
    return y


def ema(x: np.ndarray, n: int) -> np.ndarray:
    return ema_alpha(x, 2.0 / (n + 1.0))


def wilder(x: np.ndarray, n: int) -> np.ndarray:
    return ema_alpha(x, 1.0 / n)


def sma(x: np.ndarray, n: int) -> np.ndarray:
    x = np.asarray(x, dtype=float)
    out = np.full(len(x), np.nan)
    if len(x) >= n:
        c = np.cumsum(np.insert(x, 0, 0.0))
        out[n - 1:] = (c[n:] - c[:-n]) / n
    return out


def rolling_std(x: np.ndarray, n: int) -> np.ndarray:
    """Population standard deviation over n values."""
    x = np.asarray(x, dtype=float)
    out = np.full(len(x), np.nan)
    if len(x) >= n:
        w = np.lib.stride_tricks.sliding_window_view(x, n)
        out[n - 1:] = w.std(axis=1)
    return out


def rolling_max(x: np.ndarray, n: int) -> np.ndarray:
    out = np.full(len(x), np.nan)
    if len(x) >= n:
        out[n - 1:] = np.lib.stride_tricks.sliding_window_view(x, n).max(axis=1)
    return out


def rolling_min(x: np.ndarray, n: int) -> np.ndarray:
    out = np.full(len(x), np.nan)
    if len(x) >= n:
        out[n - 1:] = np.lib.stride_tricks.sliding_window_view(x, n).min(axis=1)
    return out


def shift(x: np.ndarray, k: int = 1) -> np.ndarray:
    out = np.full(len(x), np.nan)
    if k < len(x):
        out[k:] = x[:-k]
    return out


def rsi(c: np.ndarray, n: int = 14) -> np.ndarray:
    d = np.diff(c, prepend=c[0])
    g = np.where(d > 0, d, 0.0)
    l = np.where(d < 0, -d, 0.0)
    ag, al = wilder(g, n), wilder(l, n)
    with np.errstate(divide="ignore", invalid="ignore"):
        r = 100.0 - 100.0 / (1.0 + ag / al)
    r = np.where(al == 0, np.where(ag == 0, 50.0, 100.0), r)
    return r


def true_range(h, l, c) -> np.ndarray:
    pc = np.concatenate([[c[0]], c[:-1]])
    tr = np.maximum(h - l, np.maximum(np.abs(h - pc), np.abs(l - pc)))
    tr[0] = h[0] - l[0]
    return tr


def atr(h, l, c, n: int = 14) -> np.ndarray:
    return wilder(true_range(h, l, c), n)


def adx(h, l, c, n: int = 14):
    up = np.diff(h, prepend=h[0])
    dn = -np.diff(l, prepend=l[0])
    pdm = np.where((up > dn) & (up > 0), up, 0.0)
    mdm = np.where((dn > up) & (dn > 0), dn, 0.0)
    str_ = wilder(true_range(h, l, c), n)
    spdm, smdm = wilder(pdm, n), wilder(mdm, n)
    with np.errstate(divide="ignore", invalid="ignore"):
        pdi = np.where(str_ > 0, 100.0 * spdm / str_, 0.0)
        mdi = np.where(str_ > 0, 100.0 * smdm / str_, 0.0)
        s = pdi + mdi
        dx = np.where(s > 0, 100.0 * np.abs(pdi - mdi) / s, 0.0)
    return wilder(dx, n), pdi, mdi


def macd(c, fast: int = 12, slow: int = 26, signal: int = 9):
    line = ema(c, fast) - ema(c, slow)
    sig = ema(line, signal)
    return line, sig, line - sig


def bollinger(c, n: int = 20, k: float = 2.0):
    mid = sma(c, n)
    sd = rolling_std(c, n)
    return mid, mid + k * sd, mid - k * sd


def anchored_vwap(h, l, c, v, day_id) -> np.ndarray:
    """VWAP reset at each change of ``day_id`` (UTC day)."""
    tp = (h + l + c) / 3.0
    vv = np.where(v > 0, v, 1.0).astype(float)
    pv = tp * vv
    out = np.empty(len(c))
    cum_pv = cum_v = 0.0
    prev = None
    for i in range(len(c)):
        if day_id[i] != prev:
            cum_pv = cum_v = 0.0
            prev = day_id[i]
        cum_pv += pv[i]
        cum_v += vv[i]
        out[i] = cum_pv / cum_v
    return out
