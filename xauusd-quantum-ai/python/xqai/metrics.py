"""Performance metrics computed from the trade list and the equity curve."""
from __future__ import annotations

import math

import numpy as np
import pandas as pd


def max_drawdown(equity: np.ndarray) -> float:
    if len(equity) == 0:
        return 0.0
    peak = np.maximum.accumulate(equity)
    return float(np.max((peak - equity) / np.where(peak > 0, peak, 1.0)))


def daily_returns(eq: pd.DataFrame) -> pd.Series:
    if eq.empty:
        return pd.Series(dtype=float)
    s = pd.Series(eq["equity"].to_numpy(), index=pd.to_datetime(eq["time"], unit="s"))
    d = s.resample("1D").last().dropna()
    return d.pct_change().dropna()


def compute_metrics(trades: pd.DataFrame, eq: pd.DataFrame, initial_balance: float) -> dict:
    m = {"trades": int(len(trades))}
    if eq.empty:
        final = initial_balance
    else:
        final = float(eq["equity"].iloc[-1])
    m["net_profit"] = final - initial_balance
    m["return_pct"] = 100 * m["net_profit"] / initial_balance
    m["max_drawdown_pct"] = 100 * max_drawdown(eq["equity"].to_numpy()) if not eq.empty else 0.0
    if len(trades):
        pnl = trades["pnl"].to_numpy()
        wins, losses = pnl[pnl > 0], pnl[pnl <= 0]
        m["win_rate"] = 100 * len(wins) / len(pnl)
        gl = -losses.sum()
        m["profit_factor"] = float(wins.sum() / gl) if gl > 0 else float("inf")
        m["expectancy"] = float(pnl.mean())
        m["expectancy_r"] = float(trades["r"].mean())
        m["avg_win"] = float(wins.mean()) if len(wins) else 0.0
        m["avg_loss"] = float(losses.mean()) if len(losses) else 0.0
        m["commission"] = float(trades["commission"].sum())
        days = max(1.0, (trades["close_time"].max() - trades["open_time"].min()) / 86400)
        m["trades_per_day"] = len(pnl) / (days * 5 / 7)
    else:
        for k in ("win_rate", "profit_factor", "expectancy", "expectancy_r", "avg_win", "avg_loss", "commission",
                  "trades_per_day"):
            m[k] = 0.0
    dr = daily_returns(eq)
    if len(dr) > 2 and dr.std() > 0:
        m["sharpe"] = float(dr.mean() / dr.std() * math.sqrt(252))
        downside = dr[dr < 0]
        dd_std = math.sqrt((downside ** 2).mean()) if len(downside) else 0.0
        m["sortino"] = float(dr.mean() / dd_std * math.sqrt(252)) if dd_std > 0 else float("inf")
    else:
        m["sharpe"] = m["sortino"] = 0.0
    mdd_money = 0.0
    if not eq.empty:
        e = eq["equity"].to_numpy()
        mdd_money = float(np.max(np.maximum.accumulate(e) - e))
    m["recovery_factor"] = m["net_profit"] / mdd_money if mdd_money > 0 else float("inf") if m["net_profit"] > 0 else 0.0
    return m


def monthly_table(eq: pd.DataFrame) -> pd.Series:
    if eq.empty:
        return pd.Series(dtype=float)
    s = pd.Series(eq["equity"].to_numpy(), index=pd.to_datetime(eq["time"], unit="s"))
    mth = s.resample("ME").last()
    prev = mth.shift(1)
    prev.iloc[0] = s.iloc[0]
    return 100 * (mth / prev - 1)


def breakdown(trades: pd.DataFrame, by: str) -> pd.DataFrame:
    if trades.empty:
        return pd.DataFrame()
    g = trades.groupby(by)
    out = pd.DataFrame({"trades": g.size(), "win_rate": g["pnl"].apply(lambda x: 100 * (x > 0).mean()),
                        "expectancy_r": g["r"].mean(), "pnl": g["pnl"].sum()})
    return out.sort_values("trades", ascending=False)


def format_metrics(m: dict) -> str:
    keys = ["trades", "net_profit", "return_pct", "profit_factor", "win_rate", "expectancy", "expectancy_r",
            "max_drawdown_pct", "sharpe", "sortino", "recovery_factor", "trades_per_day", "commission"]
    lines = []
    for k in keys:
        v = m.get(k)
        if isinstance(v, float):
            lines.append(f"  {k:<18} {v:12.4f}")
        else:
            lines.append(f"  {k:<18} {v!s:>12}")
    return "\n".join(lines)
