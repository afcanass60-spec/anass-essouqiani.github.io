"""Tests du moteur avec des flux FACTICES (données synthétiques réservées aux tests)."""

from __future__ import annotations

import time

import numpy as np
import pandas as pd
import pytest

from app.engine import Engine
from app.feeds import Market
from app.storage import Store


class FakeGold:
    def __init__(self, price=4000.0, open_=True):
        self.price, self.open_ = price, open_
        rng = np.random.default_rng(0)
        idx = pd.date_range(end=pd.Timestamp.now(tz="UTC"), periods=3000, freq="1min")
        self._m1 = pd.Series(price + np.cumsum(rng.normal(0, 0.3, len(idx))), index=idx)
        self._m1.iloc[-1] = price

    @property
    def mid(self):
        return self.price

    @property
    def last_bid(self):
        return self.price - 0.2

    @property
    def last_ask(self):
        return self.price + 0.2

    def is_open(self):
        return self.open_

    def m1(self, hours=72):
        s = self._m1.copy()
        s.iloc[-1] = self.price
        return s


class FakePM:
    def __init__(self, markets):
        self.markets = {m.token: m for m in markets}


def make_market(token="t1", prior=1, jump_to=0.35):
    m = Market(token, "1", "US strikes Iran by test date?", "geo_middle_east", prior, 500_000, "test")
    now = time.time()
    rng = np.random.default_rng(1)
    p = 0.20
    for k in range(600, 0, -1):  # 600 min d'historique calme
        p = min(max(p + rng.normal(0, 0.001), 0.15), 0.25)
        m.hist.append((now - k * 60, p))
    m.hist.append((now, jump_to))
    return m


@pytest.fixture
def setup(tmp_path):
    sent = []

    def notify(**kw):
        sent.append(kw)
        return len(sent)

    store = Store(tmp_path / "t.db")
    gold = FakeGold()
    pm = FakePM([make_market()])
    return Engine(store, gold, pm, notify), store, gold, sent


def test_jump_detected_and_context_sent(setup):
    eng, store, gold, sent = setup
    eng.step(time.time())
    assert len(sent) == 1
    assert sent[0]["kind"] == "CONTEXTE" and sent[0]["direction"] == "NEUTRE"


def test_cooldown_prevents_repeat(setup):
    eng, store, gold, sent = setup
    eng.step(time.time())
    eng.step(time.time() + 60)
    assert sum(1 for s in sent if s["kind"] == "CONTEXTE") == 1


def test_confirmed_move_gives_signal_with_coherent_levels(setup):
    eng, store, gold, sent = setup
    t0 = time.time()
    eng.step(t0)
    c = eng.pending[0]
    atr = eng.evaluate(c)["ind"]["M15"]["atr"]
    gold.price = c.gold_ref + 2 * atr                    # l'or monte franchement
    gold._m1.iloc[-60:] = np.linspace(c.gold_ref - atr, gold.price, 60)  # tendance M15 haussière
    eng._confirmations(t0 + 16 * 60)
    sig = [s for s in sent if s["kind"] == "SIGNAL"]
    assert sig and sig[0]["direction"] == "BUY"
    tr = store.open_trades()[0]
    assert tr["sl"] < tr["entry"] < tr["tp"]
    assert abs((tr["tp"] - tr["entry"]) / (tr["entry"] - tr["sl"]) - 2.0) < 1e-6


def test_no_confirmation_means_no_trade(setup):
    eng, store, gold, sent = setup
    t0 = time.time()
    eng.step(t0)
    eng._confirmations(t0 + 31 * 60)  # l'or n'a pas bougé
    assert not store.open_trades()
    assert not any(s.get("direction") in ("BUY", "SELL") for s in sent)


def test_market_closed_defers_confirmation(setup):
    eng, store, gold, sent = setup
    gold.open_ = False
    t0 = time.time()
    eng.step(t0)
    eng._confirmations(t0 + 40 * 60)
    assert not any(s["kind"] == "SIGNAL" for s in sent)
    assert eng.pending and eng.pending[0].reference_ts is None


def test_paper_trade_hits_target(setup):
    eng, store, gold, sent = setup
    aid = 1
    store.open_trade(aid, "fed", "BUY", 4000.0, 3990.0, 4020.0)
    gold.price = 4021.0
    eng.paper_update()
    t = store.closed_trades()[0]
    assert t["outcome"] == "OBJECTIF" and t["r_multiple"] == pytest.approx(2.0)


def test_dedupe_in_store(tmp_path):
    s = Store(tmp_path / "d.db")
    assert s.add_alert("SIGNAL", "HAUTE", "k1", "fed", "BUY", "x", {}) is not None
    assert s.add_alert("SIGNAL", "HAUTE", "k1", "fed", "BUY", "x", {}) is None
