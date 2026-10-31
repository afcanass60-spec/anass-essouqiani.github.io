"""The EA and the Python research twin must share their defaults and their feature spec."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from xqai.config import FEATURE_SPEC_VERSION, Config  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
EA = ROOT / "mql5/Experts/XauQuantumAI/XauQuantumAI.mq5"
MAP = {"InpRiskPercent": "risk_percent", "InpMaxRiskPercentHard": "max_risk_percent_hard",
       "InpMaxTotalRiskPercent": "max_total_risk_percent", "InpMaxPositions": "max_positions",
       "InpMaxTradesPerDay": "max_trades_per_day", "InpDailyLossLimitPercent": "daily_loss_limit_percent",
       "InpMaxDrawdownPercent": "max_drawdown_percent", "InpMaxConsecutiveLosses": "max_consecutive_losses",
       "InpCooldownBarsAfterLoss": "cooldown_bars_after_loss", "InpReduceRiskAfterLosses": "reduce_risk_after_losses",
       "InpMinMarginLevelPercent": "min_margin_level_percent", "InpSlippageAllowancePoints": "slippage_points",
       "InpMinScore": "min_score", "InpWStructure": "w_structure", "InpWTrend": "w_trend",
       "InpWMomentum": "w_momentum", "InpWLiquidity": "w_liquidity", "InpWVolatility": "w_volatility",
       "InpWPriceAction": "w_price_action", "InpWMTF": "w_mtf", "InpMinRR": "min_rr",
       "InpMinRRMeanReversion": "min_rr_mean_reversion", "InpRRTarget": "rr_target", "InpMaxRR": "max_rr",
       "InpSLBufferATR": "sl_buffer_atr", "InpMinSLATR": "min_sl_atr", "InpMaxSLATR": "max_sl_atr",
       "InpSwingDepth": "swing_depth", "InpRegimeMatrix": "regime_matrix", "InpBreakEvenR": "break_even_r",
       "InpPartialR": "partial_r", "InpPartialFraction": "partial_fraction", "InpTrailStartR": "trail_start_r",
       "InpTrailATRMult": "trail_atr_mult", "InpCloseOnOppositeScore": "close_on_opposite_score",
       "InpMaxHoldBars": "max_hold_bars", "InpMaxSpreadPoints": "max_spread_points",
       "InpMaxSpreadATR": "max_spread_atr", "InpRolloverBlockMinutes": "rollover_block_minutes",
       "InpFridayLastEntryUTC": "friday_last_entry_utc_hour", "InpNewsBeforeMin": "news_block_before_min",
       "InpNewsAfterMin": "news_block_after_min", "InpNewsFomcMin": "news_block_fomc_min",
       "InpWarmupBars": "warmup_bars", "InpDegradedScoreBonus": "degraded_score_bonus"}


def ea_inputs():
    out = {}
    for line in EA.read_text().splitlines():
        m = re.match(r"\s*input\s+\w+\s+(Inp\w+)\s*=\s*(.+?);", line)
        if m:
            out[m.group(1)] = m.group(2).strip().strip('"')
    return out


def test_defaults_match():
    ea, cfg = ea_inputs(), Config().to_dict()
    for inp, field in MAP.items():
        py = cfg[field]
        if isinstance(py, str):
            assert ea[inp] == py, inp
        else:
            assert float(ea[inp]) == float(py), (inp, ea[inp], py)


def test_feature_spec_version():
    src = (ROOT / "mql5/Experts/XauQuantumAI/Include/Defines.mqh").read_text()
    assert f"#define XQAI_FEATURE_SPEC   {FEATURE_SPEC_VERSION}" in src
    assert "#define XQAI_N_FEATURES     40" in src


def test_mql5_lint_clean():
    import subprocess
    r = subprocess.run([sys.executable, str(ROOT / "tools/mql5_lint.py"), str(ROOT / "mql5")], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout
