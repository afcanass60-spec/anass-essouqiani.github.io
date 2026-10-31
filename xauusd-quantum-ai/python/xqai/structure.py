"""Market-structure state machine (swings, HH/HL/LH/LL, BOS, CHOCH, liquidity
sweeps, fair value gaps, order blocks).

Processed strictly bar by bar on *closed* bars, so the state at bar ``i`` only
uses information available at the close of bar ``i`` (no look-ahead: a swing
of depth k is only confirmed k bars after its extreme).  All memories expire
(FVG 100 bars, OB 150 bars), which makes the result independent of how far
back the computation started once a few swings exist -- this is what allows
the EA to recompute it on a 1000-bar window and match the Python values.
Mirror: Include/Structure.mqh.
"""
from __future__ import annotations

import numpy as np

FVG_MAX_AGE = 100
OB_MAX_AGE = 150
OB_LOOKBACK = 10
FVG_MIN_ATR = 0.1
BOS, CHOCH = 1, 2

FIELDS = ["sh_last", "sh_prev", "sl_last", "sl_prev", "struct_trend", "bias",
          "break_dir", "break_type", "break_idx", "sweep_dir", "sweep_idx", "sweep_level",
          "fvg_bull_top", "fvg_bull_bot", "fvg_bear_top", "fvg_bear_bot",
          "ob_bull_top", "ob_bull_bot", "ob_bear_top", "ob_bear_bot"]


def compute_structure(o, h, l, c, atr, k: int = 3) -> dict:
    n = len(c)
    out = {f: np.full(n, np.nan) for f in FIELDS}
    nan = np.nan
    sh_last = sh_prev = sl_last = sl_prev = nan
    sh_broken = sl_broken = False
    bias = 0
    break_dir = 0; break_type = 0; break_idx = -1
    sweep_dir = 0; sweep_idx = -1; sweep_level = nan
    fb_top = fb_bot = nan; fb_t = -1
    fs_top = fs_bot = nan; fs_t = -1
    obb_top = obb_bot = nan; obb_t = -1
    obs_top = obs_bot = nan; obs_t = -1

    for i in range(n):
        # 1. swing confirmation (extreme at j = i - k)
        j = i - k
        if j >= k:
            hj, lj = h[j], l[j]
            is_sh = True
            is_sl = True
            for m in range(1, k + 1):
                if not (hj > h[j - m] and hj >= h[j + m]):
                    is_sh = False
                if not (lj < l[j - m] and lj <= l[j + m]):
                    is_sl = False
            if is_sh:
                sh_prev, sh_last, sh_broken = sh_last, hj, False
            if is_sl:
                sl_prev, sl_last, sl_broken = sl_last, lj, False
        # 2. HH/HL vs LH/LL
        trend = 0
        if not (np.isnan(sh_prev) or np.isnan(sl_prev)):
            if sh_last > sh_prev and sl_last > sl_prev:
                trend = 1
            elif sh_last < sh_prev and sl_last < sl_prev:
                trend = -1
        # 3. zone invalidation / expiry
        if fb_t >= 0 and (l[i] <= fb_bot or i - fb_t > FVG_MAX_AGE):
            fb_top = fb_bot = nan; fb_t = -1
        if fs_t >= 0 and (h[i] >= fs_top or i - fs_t > FVG_MAX_AGE):
            fs_top = fs_bot = nan; fs_t = -1
        if obb_t >= 0 and (c[i] < obb_bot or i - obb_t > OB_MAX_AGE):
            obb_top = obb_bot = nan; obb_t = -1
        if obs_t >= 0 and (c[i] > obs_top or i - obs_t > OB_MAX_AGE):
            obs_top = obs_bot = nan; obs_t = -1
        # 4. break of structure / change of character (+ order block of the impulse)
        if not np.isnan(sh_last) and not sh_broken and c[i] > sh_last:
            break_type = CHOCH if bias < 0 else BOS
            break_dir, break_idx, bias, sh_broken = 1, i, 1, True
            for jj in range(i - 1, max(-1, i - 1 - OB_LOOKBACK), -1):
                if c[jj] < o[jj]:
                    obb_top, obb_bot, obb_t = h[jj], l[jj], i
                    break
        elif not np.isnan(sl_last) and not sl_broken and c[i] < sl_last:
            break_type = CHOCH if bias > 0 else BOS
            break_dir, break_idx, bias, sl_broken = -1, i, -1, True
            for jj in range(i - 1, max(-1, i - 1 - OB_LOOKBACK), -1):
                if c[jj] > o[jj]:
                    obs_top, obs_bot, obs_t = h[jj], l[jj], i
                    break
        # 5. liquidity sweeps: wick through the swing, close back inside
        if not np.isnan(sh_last) and not sh_broken and h[i] > sh_last and c[i] <= sh_last:
            sweep_dir, sweep_idx, sweep_level = -1, i, sh_last
        elif not np.isnan(sl_last) and not sl_broken and l[i] < sl_last and c[i] >= sl_last:
            sweep_dir, sweep_idx, sweep_level = 1, i, sl_last
        # 6. fair value gaps (3-candle imbalance)
        if i >= 2 and atr[i] > 0:
            if l[i] > h[i - 2] and l[i] - h[i - 2] >= FVG_MIN_ATR * atr[i]:
                fb_top, fb_bot, fb_t = l[i], h[i - 2], i
            if h[i] < l[i - 2] and l[i - 2] - h[i] >= FVG_MIN_ATR * atr[i]:
                fs_top, fs_bot, fs_t = l[i - 2], h[i], i

        r = out
        r["sh_last"][i] = sh_last; r["sh_prev"][i] = sh_prev
        r["sl_last"][i] = sl_last; r["sl_prev"][i] = sl_prev
        r["struct_trend"][i] = trend; r["bias"][i] = bias
        r["break_dir"][i] = break_dir; r["break_type"][i] = break_type; r["break_idx"][i] = break_idx
        r["sweep_dir"][i] = sweep_dir; r["sweep_idx"][i] = sweep_idx; r["sweep_level"][i] = sweep_level
        r["fvg_bull_top"][i] = fb_top; r["fvg_bull_bot"][i] = fb_bot
        r["fvg_bear_top"][i] = fs_top; r["fvg_bear_bot"][i] = fs_bot
        r["ob_bull_top"][i] = obb_top; r["ob_bull_bot"][i] = obb_bot
        r["ob_bear_top"][i] = obs_top; r["ob_bear_bot"][i] = obs_bot
    return out
