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
