"""Event-driven M5 backtester reproducing the EA's decision and risk logic.

Cost model: historical bar spread (x multiplier + extra points), commission per
lot per side, adverse slippage on market orders and stop exits, take profits
filled at their price (no positive slippage).  When SL and TP are both inside
the same bar the SL is assumed first (pessimistic).  Management (break-even,
partial, trailing) is evaluated at M5 bar close, i.e. slightly coarser than the
EA, which manages on every new M1 bar.  The MT5 Strategy Tester in
"Every tick based on real ticks" mode remains the reference execution test.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .config import STRATEGIES, Config, parse_scale_levels
from .news import blocked_mask
from .risk import size_group, size_position
from .signals import ai_features, best_candidates, evaluate, subset_ev
from .timeutils import SESSION_NAMES


@dataclass
class Position:
    d: int
    entry: float
    sl: float
    tp: float
    risk0: float
    lots: float
    lots0: float
    bar: int
    time: int
    strategy: str
    score: float
    prob: float
    regime: int
    session: int
    mfe: float = 0.0
    partial_done: bool = False
    be_done: bool = False
    pnl_realised: float = 0.0
    commission: float = 0.0
    ext: float = 0.0   # best price since entry (highest high for buys, lowest low for sells)
    grp: int = 0             # trade idea this leg belongs to (staggered entries share one group)
    ref_entry: float = 0.0   # first (market) entry of the group: R levels are measured from it
    ref_risk: float = 0.0
    pending: bool = False    # unfilled limit order
    expiry_bar: int = 0


@dataclass
class BacktestResult:
    trades: pd.DataFrame
    equity: pd.DataFrame
    decisions: pd.DataFrame
    config: Config
    notes: list = field(default_factory=list)
    halted: bool = False


def _session_allowed(cfg: Config) -> np.ndarray:
    return np.array([name in cfg.allowed_sessions for name in SESSION_NAMES])


def run_backtest(data: dict, cfg: Config, X: pd.DataFrame | None = None, ev: dict | None = None,
                 model=None, calendar: pd.DataFrame | None = None, start_time: int | None = None,
                 end_time: int | None = None, rng_slippage: np.random.Generator | None = None,
                 record_decisions: bool = False) -> BacktestResult:
    if X is None:
        from .features import build_features
        X = build_features(data, cfg)
    if ev is None:
        ev = evaluate(X, cfg)
    notes = []
    m5 = data["M5"]
    o, h, l, c = (m5[k].to_numpy(float) for k in ("open", "high", "low", "close"))
    spread = (m5["spread"].to_numpy(float) * cfg.spread_multiplier + cfg.extra_spread_points) * cfg.point
    times = m5["time"].to_numpy(np.int64)
    n = len(X)
    pt = cfg.point
    slip = cfg.slippage_points * pt

    best_s, best_d, best_score = best_candidates(X, ev, cfg)
    # AI probabilities for the best candidate of every row
    prob = np.full(n, np.nan)
    if cfg.ai_mode != "OFF":
        if model is None:
            notes.append("AI required but no model given: running in degraded mode (min score raised)")
        else:
            for si, s in enumerate(STRATEGIES):
                for d in (1, -1):
                    rows = np.where((best_s == si) & (best_d == d))[0]
                    if len(rows):
                        F = ai_features(X.iloc[rows], subset_ev(ev, rows), s, d, cfg.point)
                        prob[rows] = model.predict_proba(F)
    min_score = cfg.min_score + (cfg.degraded_score_bonus if (cfg.ai_mode != "OFF" and model is None) else 0.0)

    sess_ok = _session_allowed(cfg)[X["session"].to_numpy()]
    utc = X["utc"].to_numpy(np.int64)
    if calendar is not None:
        news_block = blocked_mask(utc, calendar, cfg.news_block_before_min, cfg.news_block_after_min,
                                  cfg.news_block_fomc_min)
    else:
        news_block = np.zeros(n, dtype=bool)
        notes.append("no economic calendar supplied: news filter NOT applied in this backtest")
    server_mod = X["server_mod"].to_numpy()
    rollover = (server_mod < cfg.rollover_block_minutes) | (server_mod >= 1440 - 30)
    wd = X["weekday"].to_numpy()
    hour_utc = (utc % 86400) // 3600
    friday_late = (wd == 5) & (hour_utc >= cfg.friday_last_entry_utc_hour)
    weekend_close = cfg.close_before_weekend & (wd == 5) & (hour_utc >= 20) & ((utc % 3600) // 60 >= 45)
    atr = X["m5_atr"].to_numpy()
    valid_row = X["valid"].to_numpy()
    break_dir = X["m5_break_dir"].to_numpy()
    break_type = X["m5_break_type"].to_numpy()
    break_idx = X["m5_break_idx"].to_numpy()
    regime = ev["regime"]
    day_key = X["T"].to_numpy(np.int64) // 86400
    t_lo = start_time if start_time is not None else -np.inf
    t_hi = end_time if end_time is not None else np.inf

    scale_plan = parse_scale_levels(cfg.scale_levels) if cfg.use_scaled_entries else None
    balance = equity = cfg.initial_balance
    peak = equity
    day_start_eq, cur_day = equity, None
    trades_today, consec_losses, last_loss_bar = 0, 0, -10**9
    day_blocked = halted = False
    positions: list[Position] = []          # filled legs and pending limit orders
    groups: dict = {}                       # grp -> idea-level accounting
    trades, eq_rows, decisions = [], [], []
    next_grp = 1

    def filled(lst=None):
        return [p for p in (positions if lst is None else lst) if not p.pending]

    def finish_group_if_done(g: int, t: int, price: float, reason: str):
        """An idea is finished when none of its legs is open or pending: record it as ONE trade."""
        nonlocal consec_losses, last_loss_bar
        if any(p.grp == g for p in positions):
            return
        G = groups.pop(g)
        if G["lots"] <= 0:          # nothing was ever filled
            return
        total = G["pnl"]
        trades.append({"open_time": G["time"], "close_time": int(times[t]) if t < len(times) else G["time"],
                       "dir": G["d"], "strategy": G["strategy"], "regime": G["regime"],
                       "session": SESSION_NAMES[G["session"]], "entry": G["entry_vwap"] / G["lots"], "exit": price,
                       "lots": G["lots"], "legs": G["legs"], "score": G["score"], "prob": G["prob"], "pnl": total,
                       "commission": G["commission"],
                       "r": total / G["risk_money"] if G["risk_money"] > 0 else 0.0, "reason": reason,
                       "bars": t - G["bar"]})
        if total < 0:
            consec_losses += 1
            last_loss_bar = t
        else:
            consec_losses = 0

    def close_pos(p: Position, price: float, t: int, reason: str, frac: float = 1.0):
        nonlocal balance
        lots = p.lots if frac >= 1.0 else round(np.floor(p.lots0 * frac / cfg.volume_step + 1e-9) * cfg.volume_step, 8)
        lots = min(lots, p.lots)
        pnl = (price - p.entry) * p.d * cfg.contract_size * lots
        comm = cfg.commission_per_lot_side * lots
        balance += pnl - comm
        G = groups[p.grp]
        G["pnl"] += pnl - comm
        G["commission"] += comm
        p.lots = round(p.lots - lots, 8)
        if p.lots <= 1e-9:
            positions.remove(p)
            if not filled([q for q in positions if q.grp == p.grp]):   # last open leg: drop the pending ones
                for q in [q for q in positions if q.grp == p.grp and q.pending]:
                    positions.remove(q)
            finish_group_if_done(p.grp, t, price, reason)
            return True
        return False

    def fill_leg(p: Position, price: float):
        nonlocal balance
        comm = cfg.commission_per_lot_side * p.lots
        balance -= comm
        p.pending, p.entry = False, price
        G = groups[p.grp]
        G["pnl"] -= comm
        G["commission"] += comm
        G["lots"] += p.lots
        G["legs"] += 1
        G["entry_vwap"] += price * p.lots

    for t in range(1, n):
        if halted:
            break
        r = t - 1                       # decision row (bar r just closed, bar t opens)
        T = int(times[t])
        if T < t_lo or T > t_hi:
            continue
        bid_open = o[t]
        ask_open = o[t] + spread[t]
        # ---- new day ----
        if day_key[r] != cur_day:
            cur_day = day_key[r]
            day_start_eq = equity
            trades_today, day_blocked = 0, False
        # ---- pending orders: expiry ----
        for p in [p for p in positions if p.pending and t >= p.expiry_bar]:
            positions.remove(p)
            finish_group_if_done(p.grp, t, p.entry, "expired")
        # ---- market-close management decided at bar open ----
        for p in filled():
            if p not in positions:
                continue
            reason = None
            if cfg.close_on_structure_break and break_dir[r] == -p.d and break_type[r] == 2 and break_idx[r] == r:
                reason = "structure_invalidation"
            elif best_s[r] >= 0 and best_d[r] == -p.d and best_score[r] >= cfg.close_on_opposite_score:
                reason = "opposite_signal"
            elif t - p.bar >= cfg.max_hold_bars:
                reason = "time_stop"
            elif weekend_close[r]:
                reason = "weekend"
            if reason:
                px = (bid_open - slip) if p.d == 1 else (ask_open + slip)
                close_pos(p, px, t, reason)
        # ---- entry ----
        dec_reason = ""
        if best_s[r] >= 0 and valid_row[r]:
            s = STRATEGIES[best_s[r]]
            d = int(best_d[r])
            e = ev[(s, d)]
            sc = best_score[r]
            n_groups = len({p.grp for p in positions})
            if sc < min_score:
                dec_reason = "score"
            elif cfg.ai_mode != "OFF" and model is not None and not (prob[r] >= cfg.ai_min_prob):
                dec_reason = "ai_filter"
            elif day_blocked or (equity <= day_start_eq * (1 - cfg.daily_loss_limit_percent / 100)):
                day_blocked = True
                dec_reason = "daily_loss_limit"
            elif consec_losses >= cfg.max_consecutive_losses and day_key[r] == day_key[max(0, last_loss_bar - 1)]:
                dec_reason = "consecutive_losses"
            elif t - last_loss_bar < cfg.cooldown_bars_after_loss:
                dec_reason = "cooldown"
            elif trades_today >= cfg.max_trades_per_day:
                dec_reason = "max_trades_day"
            elif n_groups >= cfg.max_positions:
                dec_reason = "max_positions"
            elif any(p.d != d for p in positions):
                dec_reason = "no_hedging"
            elif any(p.pending or (p.sl - p.entry) * p.d < 0 for p in positions):
                dec_reason = "existing_position_not_protected"
            elif not sess_ok[r]:
                dec_reason = "session"
            elif rollover[r] or friday_late[r]:
                dec_reason = "time_filter"
            elif news_block[r]:
                dec_reason = "news"
            elif spread[t] > cfg.max_spread_points * pt or spread[t] > cfg.max_spread_atr * atr[r]:
                dec_reason = "spread"
            else:
                entry = (ask_open + slip) if d == 1 else (bid_open - slip)
                sl, tp = e["sl"][r], e["tp"][r]
                risk = (entry - sl) * d
                min_rr = cfg.min_rr_mean_reversion if s == "MEAN_REVERSION" else cfg.min_rr
                if risk <= 0 or risk > cfg.max_sl_atr * atr[r] * 1.1 or (tp - entry) * d < 0.9 * min_rr * risk:
                    dec_reason = "rr_after_execution"
                elif risk < cfg.stops_level_points * pt + spread[t]:
                    dec_reason = "stops_level"
                else:
                    min_gap = cfg.stops_level_points * pt + spread[t]
                    levels = [entry]
                    if scale_plan is not None:
                        for f in scale_plan[s][1:]:
                            lv = entry - d * f * risk
                            if (lv - sl) * d > min_gap:          # every limit keeps a valid stop distance
                                levels.append(lv)
                    used_margin = sum(p.lots * cfg.contract_size * p.entry / cfg.leverage for p in positions)
                    sz = size_group(cfg, balance, equity, levels, sl, consec_losses, used_margin=used_margin)
                    open_risk = sum(max(0.0, (p.entry - p.sl) * p.d) * cfg.contract_size * p.lots for p in positions)
                    if not sz.ok:
                        dec_reason = "sizing:" + sz.reason
                    elif 100 * (open_risk + sz.risk_money) / max(min(balance, equity), 1e-9) > cfg.max_total_risk_percent + 1e-9 \
                            and positions:
                        dec_reason = "total_risk"
                    else:
                        g = next_grp
                        next_grp += 1
                        groups[g] = {"pnl": 0.0, "commission": 0.0, "lots": 0.0, "legs": 0, "entry_vwap": 0.0,
                                     "risk_money": sz.risk_money, "time": T, "bar": t, "d": d, "strategy": s,
                                     "regime": int(regime[r]), "session": int(X["session"].iat[r]), "score": float(sc),
                                     "prob": float(prob[r]) if not np.isnan(prob[r]) else -1.0}
                        for k, lv in enumerate(levels[:sz.n_legs]):
                            p = Position(d, lv, sl, tp, abs(lv - sl), sz.lots_per_leg, sz.lots_per_leg, t, T, s,
                                         float(sc), groups[g]["prob"], int(regime[r]), int(X["session"].iat[r]),
                                         ext=entry, grp=g, ref_entry=entry, ref_risk=risk, pending=k > 0,
                                         expiry_bar=t + cfg.scale_expiry_bars)
                            positions.append(p)
                            if k == 0:
                                fill_leg(p, entry)
                        trades_today += 1
                        dec_reason = "OPEN" if sz.n_legs == 1 else f"OPEN_{sz.n_legs}_LEGS"
            if record_decisions:
                decisions.append({"time": T, "strategy": s, "dir": d, "score": float(sc), "prob": float(prob[r]),
                                  "regime": int(regime[r]), "decision": dec_reason})
        # ---- limit orders filled during bar t (buy limit: ask <= price, sell limit: bid >= price) ----
        for p in [p for p in positions if p.pending]:
            if (p.d == 1 and l[t] + spread[t] <= p.entry) or (p.d == -1 and h[t] >= p.entry):
                fill_leg(p, p.entry)
        # ---- intrabar exits on bar t ----
        for p in filled():
            if p not in positions:
                continue
            hb, lb = h[t], l[t]
            if p.d == 1:
                if lb <= p.sl:
                    px = min(p.sl, bid_open) - slip   # gap through SL fills at the open
                    close_pos(p, px, t, "stop_loss" if p.sl < p.entry else "protected_stop")
                    continue
                if hb >= p.tp:
                    close_pos(p, p.tp, t, "take_profit")
                    continue
            else:
                ah, al_ = hb + spread[t], lb + spread[t]
                if ah >= p.sl:
                    px = max(p.sl, ask_open) + slip
                    close_pos(p, px, t, "stop_loss" if p.sl > p.entry else "protected_stop")
                    continue
                if al_ <= p.tp:
                    close_pos(p, p.tp, t, "take_profit")
                    continue
            # ---- management at bar close (R levels measured from the group's first entry) ----
            p.ext = max(p.ext, hb) if p.d == 1 else min(p.ext, lb + spread[t])
            fav = (p.ext - p.ref_entry) * p.d
            if cfg.use_partial and not p.partial_done and fav >= cfg.partial_r * p.ref_risk:
                part_lots = np.floor(p.lots0 * cfg.partial_fraction / cfg.volume_step + 1e-9) * cfg.volume_step
                if part_lots >= cfg.volume_min and p.lots - part_lots >= cfg.volume_min - 1e-9:
                    close_pos(p, p.ref_entry + p.d * cfg.partial_r * p.ref_risk, t, "partial", cfg.partial_fraction)
                p.partial_done = True
            if fav >= cfg.partial_r * p.ref_risk:
                # the move is under way: unfilled legs of this idea are no longer wanted
                for q in [q for q in positions if q.grp == p.grp and q.pending]:
                    positions.remove(q)
            new_sl = p.sl
            if cfg.use_break_even and not p.be_done and fav >= cfg.break_even_r * p.ref_risk:
                be = p.entry + p.d * (spread[t] + 2 * cfg.commission_per_lot_side / cfg.contract_size)
                if (be - new_sl) * p.d > 0:
                    new_sl = be
                p.be_done = True
            if cfg.use_trailing and fav >= cfg.trail_start_r * p.ref_risk and atr[t] > 0:
                trail = p.ext - p.d * cfg.trail_atr_mult * atr[t]
                if (trail - new_sl) * p.d > 0:
                    new_sl = trail
            cur_px = c[t] if p.d == 1 else c[t] + spread[t]
            min_gap = cfg.stops_level_points * pt + spread[t]
            if (new_sl - p.sl) * p.d > 0 and (cur_px - new_sl) * p.d > min_gap:   # SL only moves to reduce risk
                p.sl = new_sl
        # ---- equity, drawdown guard ----
        floating = sum((((c[t] - p.entry) if p.d == 1 else (p.entry - c[t] - spread[t])) * cfg.contract_size * p.lots)
                       for p in filled())
        equity = balance + floating
        peak = max(peak, equity)
        dd = (peak - equity) / peak if peak > 0 else 0
        eq_rows.append((int(times[t]), balance, equity, dd))
        if cfg.max_drawdown_percent > 0 and dd * 100 >= cfg.max_drawdown_percent:
            for p in [p for p in positions if p.pending]:
                positions.remove(p)
            for p in filled():
                px = (c[t] - slip) if p.d == 1 else (c[t] + spread[t] + slip)
                close_pos(p, px, t, "max_drawdown_halt")
            halted = True
            notes.append(f"max drawdown {cfg.max_drawdown_percent}% reached at {pd.Timestamp(int(times[t]), unit='s')}: trading halted")

    for p in [p for p in positions if p.pending]:
        positions.remove(p)
    for p in filled():
        close_pos(p, c[n - 1] if p.d == 1 else c[n - 1] + spread[n - 1], n - 1, "end_of_test")
    for g in list(groups):
        finish_group_if_done(g, n - 1, c[n - 1], "end_of_test")
    eq = pd.DataFrame(eq_rows, columns=["time", "balance", "equity", "drawdown"])
    tr = pd.DataFrame(trades)
    return BacktestResult(tr, eq, pd.DataFrame(decisions), cfg, notes, halted)
