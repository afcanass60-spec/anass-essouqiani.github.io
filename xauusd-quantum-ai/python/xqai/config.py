"""Configuration of the research / backtest engine.

Every field mirrors an input of the MQL5 Expert Advisor (same name without the
``Inp`` prefix, snake_case).  Keeping both sides aligned is what makes the
Python backtester a faithful research twin of the EA.  See docs/ARCHITECTURE.md.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field, fields
from pathlib import Path

FEATURE_SPEC_VERSION = 1

STRATEGIES = ["TREND_PULLBACK", "BREAKOUT", "LIQ_SWEEP", "REVERSAL", "MOMENTUM", "MEAN_REVERSION"]
STRATEGY_CODES = {"TREND_PULLBACK": "PB", "BREAKOUT": "BO", "LIQ_SWEEP": "SW",
                  "REVERSAL": "RV", "MOMENTUM": "MO", "MEAN_REVERSION": "MR"}
COUNTER_TREND = {"LIQ_SWEEP", "REVERSAL", "MEAN_REVERSION"}

REGIMES = ["TREND_UP", "TREND_DOWN", "RANGE", "SQUEEZE", "VOLATILE", "TRANSITION"]
REGIME_CODES = {"TREND_UP": "TU", "TREND_DOWN": "TD", "RANGE": "RG", "SQUEEZE": "SQ",
                "VOLATILE": "VO", "TRANSITION": "TR"}

SESSIONS = ["ASIA", "LONDON", "NEWYORK", "OVERLAP", "OFF"]

# Default regime -> allowed strategies matrix (same string format as the EA input).
DEFAULT_REGIME_MATRIX = "TU:PB,MO,BO|TD:PB,MO,BO|SQ:BO|RG:MR,SW,RV|TR:SW,RV,PB|VO:"

SCORE_COMPONENTS = ["structure", "trend", "momentum", "liquidity", "volatility", "price_action", "mtf"]


@dataclass
class Config:
    # ---- instrument / broker model (backtest only; the EA reads them from the broker) ----
    symbol: str = "XAUUSD"
    point: float = 0.01
    contract_size: float = 100.0
    volume_min: float = 0.01
    volume_step: float = 0.01
    volume_max: float = 50.0
    leverage: float = 100.0
    commission_per_lot_side: float = 0.0     # account currency per 1.0 lot per side
    spread_multiplier: float = 1.0           # stress test: multiply historical spread
    extra_spread_points: float = 0.0         # stress test: add points to every spread
    slippage_points: float = 5.0             # mean adverse slippage on market orders/stops
    stops_level_points: int = 0
    server_tz_model: str = "EET_US"          # EET_US | EET_EU | FIXED
    server_gmt_offset_hours: float = 2.0     # used when server_tz_model == FIXED

    # ---- account ----
    initial_balance: float = 100.0

    # ---- risk ----
    risk_percent: float = 0.5
    max_risk_percent_hard: float = 0.75      # refuse the trade if the minimum lot exceeds this risk
    max_total_risk_percent: float = 1.0
    max_positions: int = 2
    max_trades_per_day: int = 5
    daily_loss_limit_percent: float = 2.0
    max_drawdown_percent: float = 5.0
    max_consecutive_losses: int = 3
    cooldown_bars_after_loss: int = 6
    reduce_risk_after_losses: int = 2        # after N consecutive losses risk is halved (never increased)
    min_margin_level_percent: float = 300.0

    # ---- signal ----
    min_score: float = 65.0
    w_structure: float = 20.0
    w_trend: float = 20.0
    w_momentum: float = 15.0
    w_liquidity: float = 15.0
    w_volatility: float = 10.0
    w_price_action: float = 10.0
    w_mtf: float = 10.0
    min_rr: float = 2.0
    min_rr_mean_reversion: float = 1.5
    rr_target: float = 2.0
    max_rr: float = 4.0
    sl_buffer_atr: float = 0.3
    min_sl_atr: float = 0.8
    max_sl_atr: float = 3.0
    swing_depth: int = 3
    regime_matrix: str = DEFAULT_REGIME_MATRIX
    enabled_strategies: list = field(default_factory=lambda: list(STRATEGIES))

    # ---- AI ----
    ai_mode: str = "OFF"                     # OFF | NATIVE
    ai_model_path: str = ""
    ai_min_prob: float = 0.55
    degraded_score_bonus: float = 10.0       # min_score increase when AI is required but unavailable

    # ---- position management ----
    use_break_even: bool = True
    break_even_r: float = 1.0
    use_partial: bool = True
    partial_r: float = 1.0
    partial_fraction: float = 0.5
    use_trailing: bool = True
    trail_start_r: float = 1.5
    trail_atr_mult: float = 2.5
    close_on_structure_break: bool = True
    close_on_opposite_score: float = 80.0
    max_hold_bars: int = 288
    close_before_weekend: bool = True

    # ---- filters ----
    max_spread_points: float = 60.0
    max_spread_atr: float = 0.25
    allowed_sessions: list = field(default_factory=lambda: ["LONDON", "NEWYORK", "OVERLAP"])
    rollover_block_minutes: int = 60
    friday_last_entry_utc_hour: int = 19
    news_block_before_min: int = 30
    news_block_after_min: int = 30
    news_block_fomc_min: int = 60
    news_csv: str = ""

    # ---- backtest engine ----
    warmup_bars: int = 300
    seed: int = 7

    def weights(self) -> dict:
        w = {"structure": self.w_structure, "trend": self.w_trend, "momentum": self.w_momentum,
             "liquidity": self.w_liquidity, "volatility": self.w_volatility,
             "price_action": self.w_price_action, "mtf": self.w_mtf}
        s = sum(w.values())
        if s <= 0:
            raise ValueError("score weights must sum to a positive value")
        return {k: 100.0 * v / s for k, v in w.items()}

    def to_dict(self) -> dict:
        return asdict(self)

    def save(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(self.to_dict(), indent=2))

    @classmethod
    def load(cls, path: str | Path | None = None, **overrides) -> "Config":
        data = {}
        if path:
            data = json.loads(Path(path).read_text())
        data.update(overrides)
        known = {f.name for f in fields(cls)}
        unknown = set(data) - known
        if unknown:
            raise KeyError(f"unknown config keys: {sorted(unknown)}")
        return cls(**data)

    def replace(self, **kw) -> "Config":
        d = self.to_dict()
        d.update(kw)
        return Config(**d)


def parse_regime_matrix(s: str) -> dict:
    """'TU:PB,MO|RG:MR' -> {'TREND_UP': {'TREND_PULLBACK','MOMENTUM'}, 'RANGE': {...}}."""
    inv_r = {v: k for k, v in REGIME_CODES.items()}
    inv_s = {v: k for k, v in STRATEGY_CODES.items()}
    out = {r: set() for r in REGIMES}
    for part in filter(None, s.split("|")):
        code, _, strats = part.partition(":")
        reg = inv_r[code.strip()]
        for sc in filter(None, strats.split(",")):
            out[reg].add(inv_s[sc.strip()])
    return out


def format_regime_matrix(m: dict) -> str:
    parts = []
    for reg in ["TREND_UP", "TREND_DOWN", "SQUEEZE", "RANGE", "TRANSITION", "VOLATILE"]:
        codes = [STRATEGY_CODES[s] for s in STRATEGIES if s in m.get(reg, set())]
        parts.append(f"{REGIME_CODES[reg]}:{','.join(codes)}")
    return "|".join(parts)
