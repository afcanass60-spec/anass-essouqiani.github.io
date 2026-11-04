import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from xqai import indicators as ind  # noqa: E402
from xqai.backtester import run_backtest  # noqa: E402
from xqai.config import Config, format_regime_matrix, parse_regime_matrix, DEFAULT_REGIME_MATRIX  # noqa: E402
from xqai.data import synthetic_dataset  # noqa: E402
from xqai.features import build_features  # noqa: E402
from xqai.news import blocked_mask  # noqa: E402
from xqai.risk import size_position  # noqa: E402
from xqai.signals import ai_features, evaluate, subset_ev  # noqa: E402
from xqai.structure import compute_structure  # noqa: E402
from xqai.timeutils import (SESSION_ASIA, SESSION_LONDON, SESSION_NEWYORK, SESSION_OFF, SESSION_OVERLAP,  # noqa: E402
                            eu_dst_range, server_to_utc, session_of_utc, us_dst_range)


def ts(s):
    return int(pd.Timestamp(s, tz="UTC").timestamp())


@pytest.fixture(scope="module")
def synth():
    cfg = Config(initial_balance=10000, max_drawdown_percent=0)
    data = synthetic_dataset(days=110, seed=5)
    X = build_features(data, cfg)
    return cfg, data, X


# ------------------------------------------------------------------ time
def test_dst_dates():
    s, e = us_dst_range(2024)
    assert pd.Timestamp(s * 86400, unit="s").date().isoformat() == "2024-03-10"
    assert pd.Timestamp(e * 86400, unit="s").date().isoformat() == "2024-11-03"
    s, e = eu_dst_range(2024)
    assert pd.Timestamp(s * 86400, unit="s").date().isoformat() == "2024-03-31"
    assert pd.Timestamp(e * 86400, unit="s").date().isoformat() == "2024-10-27"


def test_server_to_utc():
    # EET_US broker: GMT+3 during US DST, GMT+2 otherwise
    assert server_to_utc(ts("2024-07-01 12:00"), "EET_US") == ts("2024-07-01 09:00")
    assert server_to_utc(ts("2024-01-15 12:00"), "EET_US") == ts("2024-01-15 10:00")
    # between US and EU switch (2024-03-20): US DST on, EU off
    assert server_to_utc(ts("2024-03-20 12:00"), "EET_US") == ts("2024-03-20 09:00")
    assert server_to_utc(ts("2024-03-20 12:00"), "EET_EU") == ts("2024-03-20 10:00")
    assert server_to_utc(ts("2024-01-15 12:00"), "FIXED", 0) == ts("2024-01-15 12:00")


def test_sessions():
    assert session_of_utc(ts("2024-01-15 03:00")) == SESSION_ASIA
    assert session_of_utc(ts("2024-01-15 09:00")) == SESSION_LONDON
    assert session_of_utc(ts("2024-01-15 14:00")) == SESSION_OVERLAP      # winter: NY opens 13:00 UTC
    assert session_of_utc(ts("2024-01-15 12:30")) == SESSION_LONDON
    assert session_of_utc(ts("2024-07-15 12:30")) == SESSION_OVERLAP      # summer: NY opens 12:00 UTC
    assert session_of_utc(ts("2024-01-15 18:00")) == SESSION_NEWYORK
    assert session_of_utc(ts("2024-01-15 22:30")) == SESSION_OFF


# ------------------------------------------------------------------ indicators
def test_ema_matches_loop():
    x = np.random.default_rng(0).normal(size=300).cumsum()
    a = 2 / 21
    y = [x[0]]
    for v in x[1:]:
        y.append(y[-1] + a * (v - y[-1]))
    assert np.allclose(ind.ema(x, 20), y)


def test_rsi_atr_adx_ranges():
    rng = np.random.default_rng(1)
    c = 2000 + rng.normal(size=1000).cumsum()
    h, l = c + rng.random(1000), c - rng.random(1000)
    r = ind.rsi(c)
    assert np.all((r >= 0) & (r <= 100))
    assert np.all(ind.atr(h, l, c) > 0)
    adx, pdi, mdi = ind.adx(h, l, c)
    assert np.all((adx >= 0) & (adx <= 100))
    flat = np.full(100, 5.0)
    assert np.allclose(ind.rsi(flat), 50.0)


def test_bollinger_population_std():
    x = np.arange(30, dtype=float)
    mid, up, lo = ind.bollinger(x, 20, 2)
    assert np.isclose(up[19] - mid[19], 2 * np.std(x[:20]))


# ------------------------------------------------------------------ structure / no look-ahead
def test_structure_bos_choch():
    # down swing, up swing, then break above the swing high
    c = np.array([10, 9, 8, 7, 6, 7, 8, 9, 10, 11, 10, 9, 8, 9, 10, 11, 12, 13, 14, 15], float)
    o = c - 0.1
    h, l = c + 0.5, c - 0.5
    st = compute_structure(o, h, l, c, np.full(len(c), 1.0), k=2)
    assert st["sh_last"][-1] == pytest.approx(11.5)
    assert st["break_dir"][-1] == 1


def test_structure_prefix_invariance(synth):
    _, data, _ = synth
    df = data["M5"]
    o, h, l, c = (df[k].to_numpy() for k in ("open", "high", "low", "close"))
    atr = ind.atr(h, l, c)
    full = compute_structure(o, h, l, c, atr)
    cut = 5000
    part = compute_structure(o[:cut], h[:cut], l[:cut], c[:cut], atr[:cut])
    for k in full:
        assert np.allclose(full[k][:cut], part[k], equal_nan=True), k


def test_features_no_lookahead(synth):
    """Features of a row must not change when the future is removed from the data."""
    cfg, data, X = synth
    T_cut = int(X["T"].iloc[int(len(X) * 0.8)])
    trunc = {tf: df[df["time"] < T_cut].reset_index(drop=True) for tf, df in data.items()}
    Xt = build_features(trunc, cfg)
    common = Xt.columns.intersection(X.columns)
    a = Xt[Xt["valid"]].tail(200)
    b = X.set_index("T").loc[a["T"]]
    for col in common:
        if col in ("T", "i") or col.endswith("_idx"):
            continue
        va, vb = a[col].to_numpy(float), b[col].to_numpy(float)
        assert np.allclose(va, vb, equal_nan=True, rtol=1e-9, atol=1e-9), col


# ------------------------------------------------------------------ risk
def test_small_account_refuses_min_lot():
    cfg = Config(initial_balance=100)
    r = size_position(cfg, 100, 100, 2000.0, 1997.0)   # 3$ SL on 0.01 lot = 3$ = 3% of 100
    assert not r.ok and r.reason == "min_lot_risk_exceeds_cap"


def test_cent_account_sizes_correctly():
    cfg = Config()
    r = size_position(cfg, 10000, 10000, 2000.0, 1997.0)   # 10000 USC
    assert r.ok
    assert r.risk_percent <= cfg.risk_percent + 1e-9
    assert r.lots == pytest.approx(0.16)


def test_risk_never_increases_after_losses():
    cfg = Config()
    base = size_position(cfg, 10000, 10000, 2000, 1995).lots
    for k in range(10):
        assert size_position(cfg, 10000, 10000, 2000, 1995, consecutive_losses=k).lots <= base


def test_margin_check():
    cfg = Config(leverage=1, risk_percent=5, max_risk_percent_hard=10)
    assert size_position(cfg, 1000, 1000, 2000, 1999).reason in ("insufficient_free_margin", "margin_level_limit")


def test_regime_matrix_roundtrip():
    m = parse_regime_matrix(DEFAULT_REGIME_MATRIX)
    assert parse_regime_matrix(format_regime_matrix(m)) == m


# ------------------------------------------------------------------ backtest invariants
def test_backtest_invariants(synth):
    cfg, data, X = synth
    res = run_backtest(data, cfg, X, evaluate(X, cfg), record_decisions=True)
    tr = res.trades
    assert len(tr) > 0
    assert (tr.groupby(tr["open_time"] // 86400).size() <= cfg.max_trades_per_day).all()
    # sizes never exceed the risk budget at the time of entry (equity-based)
    assert (tr["lots"] > 0).all()
    assert tr["lots"].max() <= 10000 * 2 * cfg.risk_percent / 100 / (cfg.min_sl_atr * 0.5 * 100) + 1
    # no hedging: no two overlapping positions with opposite directions
    rows = tr.sort_values("open_time").to_dict("records")
    for i, a in enumerate(rows):
        for b in rows[i + 1:]:
            if b["open_time"] >= a["close_time"]:
                break
            assert a["dir"] == b["dir"]


def test_costs_reduce_profit(synth):
    cfg, data, X = synth
    ev = evaluate(X, cfg)
    a = run_backtest(data, cfg, X, ev)
    b = run_backtest(data, cfg.replace(commission_per_lot_side=5.0), X, ev)
    assert b.equity["equity"].iloc[-1] < a.equity["equity"].iloc[-1]


def test_ai_features_shape(synth):
    cfg, data, X = synth
    ev = evaluate(X, cfg)
    rows = np.arange(len(X) - 10, len(X))
    F = ai_features(X.iloc[rows], subset_ev(ev, rows), "TREND_PULLBACK", 1)
    assert F.shape == (10, 40) and np.all(np.isfinite(F))


# ------------------------------------------------------------------ news
def test_news_block():
    cal = pd.DataFrame({"time_utc": [ts("2024-05-03 12:30"), ts("2024-05-01 18:00")],
                        "currency": ["USD", "USD"], "importance": ["HIGH", "HIGH"],
                        "name": ["Nonfarm Payrolls", "FOMC Statement"]})
    cal["name_l"] = cal["name"].str.lower()
    t = np.array([ts("2024-05-03 12:05"), ts("2024-05-03 11:55"), ts("2024-05-01 17:10"), ts("2024-05-01 19:30")])
    assert blocked_mask(t, cal, 30, 30, 60).tolist() == [True, False, True, False]


# ------------------------------------------------------------------ staggered entries
def test_size_group_total_risk_matches_budget():
    from xqai.risk import size_group
    cfg = Config(risk_percent=2.0, max_risk_percent_hard=2.0)
    # the user's example: SELL, SL 4075, entries spread between 4063 and 4070
    g = size_group(cfg, 3000, 3000, [4063, 4065, 4067, 4068, 4070], 4075)
    assert g.ok and g.n_legs >= 2
    assert g.risk_percent <= 2.0 + 1e-9
    single = size_position(cfg, 3000, 3000, 4063, 4075)
    assert g.lots_per_leg * g.n_legs >= single.lots      # closer average entry => more lots, same risk


def test_size_group_drops_legs_below_min_lot():
    from xqai.risk import size_group
    cfg = Config(risk_percent=0.5)
    g = size_group(cfg, 3000, 3000, [4063, 4067, 4070], 4075)
    assert g.ok and g.lots_per_leg >= cfg.volume_min
    assert g.risk_percent <= cfg.max_risk_percent_hard + 1e-9


def test_scale_levels_parsing():
    from xqai.config import DEFAULT_SCALE_LEVELS, parse_scale_levels
    plan = parse_scale_levels(DEFAULT_SCALE_LEVELS)
    assert plan["LIQ_SWEEP"] == [0.0, 0.35, 0.6] and plan["BREAKOUT"] == [0.0]
    with pytest.raises(ValueError):
        parse_scale_levels("SW:0.2,0.4")          # must start with the market entry


def test_scaled_backtest_never_exceeds_risk(synth):
    cfg, data, X = synth
    c2 = cfg.replace(use_scaled_entries=True, risk_percent=2.0, max_risk_percent_hard=2.0, max_total_risk_percent=2.0,
                     daily_loss_limit_percent=4.0)
    res = run_backtest(data, c2, X, evaluate(X, c2), record_decisions=True)
    tr = res.trades
    assert len(tr) > 0 and (tr["legs"] >= 1).all()
    assert tr["legs"].max() > 1                        # some ideas really were split
    # a full stop-out of an idea costs about -1R (slippage/gaps can add a little), never more
    assert tr["r"].min() > -1.3
    assert (tr.groupby(tr["open_time"] // 86400).size() <= c2.max_trades_per_day).all()
