"""Position sizing and pre-trade risk checks (mirror of Include/RiskManager.mqh).

The lot is a function of equity, allowed risk, stop distance and contract
specification ONLY.  It never depends on previous results except to be
*reduced* after a losing streak.  No martingale, no averaging down.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from .config import Config


@dataclass
class SizeResult:
    lots: float
    risk_money: float
    risk_percent: float
    reason: str = ""

    @property
    def ok(self) -> bool:
        return self.lots > 0 and not self.reason


def floor_step(x: float, step: float) -> float:
    return math.floor(x / step + 1e-9) * step


def size_position(cfg: Config, balance: float, equity: float, entry: float, sl: float,
                  consecutive_losses: int = 0, free_margin: float | None = None,
                  used_margin: float = 0.0) -> SizeResult:
    capital = min(balance, equity)
    if capital <= 0:
        return SizeResult(0, 0, 0, "no_capital")
    mult = 0.5 if (cfg.reduce_risk_after_losses > 0 and consecutive_losses >= cfg.reduce_risk_after_losses) else 1.0
    risk_money = capital * cfg.risk_percent / 100.0 * mult
    dist = abs(entry - sl) + cfg.slippage_points * cfg.point
    if dist <= 0:
        return SizeResult(0, 0, 0, "zero_stop_distance")
    loss_per_lot = dist * cfg.contract_size + 2.0 * cfg.commission_per_lot_side
    lots = min(floor_step(risk_money / loss_per_lot, cfg.volume_step), cfg.volume_max)
    if lots < cfg.volume_min - 1e-12:
        min_risk = cfg.volume_min * loss_per_lot
        if min_risk > capital * cfg.max_risk_percent_hard / 100.0:
            return SizeResult(0, min_risk, 100.0 * min_risk / capital,
                              "min_lot_risk_exceeds_cap")
        lots = cfg.volume_min
    lots = round(lots, 8)
    actual = lots * loss_per_lot
    # margin check
    margin = lots * cfg.contract_size * entry / cfg.leverage
    fm = equity - used_margin if free_margin is None else free_margin
    if margin > fm:
        return SizeResult(0, actual, 100 * actual / capital, "insufficient_free_margin")
    total_margin = used_margin + margin
    if total_margin > 0 and 100.0 * equity / total_margin < cfg.min_margin_level_percent:
        return SizeResult(0, actual, 100 * actual / capital, "margin_level_limit")
    return SizeResult(lots, actual, 100.0 * actual / capital)


@dataclass
class GroupSize:
    lots_per_leg: float
    n_legs: int
    risk_money: float
    risk_percent: float
    reason: str = ""

    @property
    def ok(self) -> bool:
        return self.lots_per_leg > 0 and self.n_legs > 0 and not self.reason


def size_group(cfg: Config, balance: float, equity: float, entries: list, sl: float,
               consecutive_losses: int = 0, used_margin: float = 0.0) -> GroupSize:
    """Staggered entries sharing one SL. Equal lots per leg, sized so that the TOTAL loss when every
    leg is filled and the SL is hit equals the risk budget. If the legs would be below the minimum
    lot, the deepest legs are dropped; with one leg left the single-entry rules apply (hard cap)."""
    capital = min(balance, equity)
    if capital <= 0:
        return GroupSize(0, 0, 0, 0, "no_capital")
    mult = 0.5 if (cfg.reduce_risk_after_losses > 0 and consecutive_losses >= cfg.reduce_risk_after_losses) else 1.0
    budget = capital * cfg.risk_percent / 100.0 * mult
    slip = cfg.slippage_points * cfg.point
    for n in range(len(entries), 1, -1):
        legs = entries[:n]
        loss_one_lot_each = sum((abs(e - sl) + slip) * cfg.contract_size + 2 * cfg.commission_per_lot_side for e in legs)
        lots = min(floor_step(budget / loss_one_lot_each, cfg.volume_step), cfg.volume_max)
        if lots >= cfg.volume_min - 1e-12:
            lots = round(lots, 8)
            margin = n * lots * cfg.contract_size * entries[0] / cfg.leverage
            if margin > equity - used_margin:
                return GroupSize(0, 0, 0, 0, "insufficient_free_margin")
            if 100.0 * equity / (used_margin + margin) < cfg.min_margin_level_percent:
                return GroupSize(0, 0, 0, 0, "margin_level_limit")
            risk = lots * loss_one_lot_each
            return GroupSize(lots, n, risk, 100.0 * risk / capital)
    single = size_position(cfg, balance, equity, entries[0], sl, consecutive_losses, used_margin=used_margin)
    return GroupSize(single.lots, 1 if single.ok else 0, single.risk_money, single.risk_percent, single.reason)
