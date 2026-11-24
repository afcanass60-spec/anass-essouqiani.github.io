"""Flux de données en direct.

- Or : cotations publiques Swissquote XAU/USD (bid/ask), interrogées toutes les ~10 s.
  Démarrage à chaud : bougies M1 Dukascopy des 3 derniers jours, pour avoir ATR/EMA tout de suite.
- Polymarket : découverte des marchés liés à l'or (Gamma), probabilités en direct (CLOB /midpoints),
  historique récent au démarrage (CLOB /prices-history) pour calibrer la volatilité de chaque marché.

Aucune valeur n'est inventée : en cas d'échec, la donnée est absente et le moteur le sait.
"""

from __future__ import annotations

import json
import logging
import math
import threading
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone

import numpy as np
import pandas as pd
import requests

from app.config import CFG
from app.storage import Store

log = logging.getLogger("feeds")
UA = {"User-Agent": "gold-intel/0.1 (personal research)"}
SWISSQUOTE = "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD"
GAMMA = "https://gamma-api.polymarket.com"
CLOB = "https://clob.polymarket.com"


# ============================================================================ OR
class GoldFeed:
    def __init__(self, store: Store):
        self.store = store
        self.last_bid = self.last_ask = None
        self.last_quote_ts = 0.0      # horodatage de la cotation (source)
        self.last_change_ts = 0.0     # dernière fois où le prix a changé
        self.last_ok = 0.0            # dernière requête réussie
        self.errors = 0

    def poll(self) -> bool:
        try:
            r = requests.get(SWISSQUOTE, headers=UA, timeout=10)
            r.raise_for_status()
            data = r.json()
            entry = next((e for e in data if e["topo"]["platform"] == "SwissquoteCapitalMarkets"), data[0])
            prof = {p["spreadProfile"]: p for p in entry["spreadProfilePrices"]}
            q = prof.get("elite") or prof.get("prime") or entry["spreadProfilePrices"][0]
            bid, ask, ts = float(q["bid"]), float(q["ask"]), float(entry["ts"]) / 1000
        except Exception as e:  # noqa: BLE001
            self.errors += 1
            log.warning("or: échec de la cotation (%s)", e)
            return False
        now = time.time()
        if (bid, ask) != (self.last_bid, self.last_ask):
            self.last_change_ts = now
        self.last_bid, self.last_ask, self.last_quote_ts, self.last_ok = bid, ask, ts, now
        self.errors = 0
        self.store.add_tick(now, bid, ask)
        return True

    @property
    def mid(self) -> float | None:
        return (self.last_bid + self.last_ask) / 2 if self.last_bid else None

    def is_open(self) -> bool:
        """Marché considéré ouvert si le prix a bougé dans les 5 dernières minutes."""
        return self.last_change_ts > 0 and time.time() - self.last_change_ts < 300

    def warmup_from_dukascopy(self, days: int = 3) -> int:
        """Charge les bougies M1 Dukascopy des derniers jours complets (best-effort)."""
        from research.data.dukascopy import POINT, decode, fetch_day  # réutilise le téléchargeur testé
        s = requests.Session()
        n = 0
        today = datetime.now(timezone.utc).date()
        for k in range(days, 0, -1):
            d: date = today - timedelta(days=k)
            raw = fetch_day(s, "XAUUSD", d, max_retries=2)
            if not raw:
                continue
            df = decode(raw, d, POINT["XAUUSD"])
            df = df[df["volume"] > 0]
            for ts, c in zip(df.index, df["close"]):
                self.store.add_tick((ts + timedelta(minutes=1)).timestamp(), float(c), float(c))
                n += 1
        # Bougies H1 des 2 derniers mois (2 requêtes) pour les tendances H1/H4, avant les données M1.
        first_m1 = min((r["ts"] for r in self.store.ticks_since(0)), default=time.time())
        for back in (1, 0):
            y, mo = today.year, today.month - back
            if mo == 0:
                y, mo = y - 1, 12
            url = f"https://datafeed.dukascopy.com/datafeed/XAUUSD/{y:04d}/{mo - 1:02d}/BID_candles_hour_1.bi5"
            try:
                r = s.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=90)
                if r.status_code != 200 or not r.content:
                    continue
                df = decode(r.content, date(y, mo, 1), POINT["XAUUSD"])
            except Exception:  # noqa: BLE001
                continue
            df = df[df["volume"] > 0]
            for ts, c in zip(df.index, df["close"]):
                t = (ts + timedelta(hours=1)).timestamp()
                if t < first_m1:
                    self.store.add_tick(t, float(c), float(c))
                    n += 1
        log.info("or: %d points Dukascopy chargés pour l'échauffement (M1 récents + H1 2 mois)", n)
        return n

    def m1(self, hours: float = 72) -> pd.Series:
        rows = self.store.ticks_since(time.time() - hours * 3600)
        if not rows:
            return pd.Series(dtype=float)
        s = pd.Series([(r["bid"] + r["ask"]) / 2 for r in rows],
                      index=pd.to_datetime([r["ts"] for r in rows], unit="s", utc=True))
        return s.resample("1min").last().dropna()


def indicators(m1: pd.Series) -> dict:
    """ATR/EMA/RSI multi-horizons à partir des clôtures M1. Retourne {} si historique insuffisant."""
    if len(m1) < 120:
        return {}
    out = {}
    for lab, rule in [("M5", "5min"), ("M15", "15min"), ("H1", "1h"), ("H4", "4h")]:
        o = m1.resample(rule).agg(["first", "max", "min", "last"]).dropna()
        o.columns = ["open", "high", "low", "close"]
        if len(o) < 20:
            continue
        tr = pd.concat([o["high"] - o["low"], (o["high"] - o["close"].shift()).abs(),
                        (o["low"] - o["close"].shift()).abs()], axis=1).max(axis=1)
        d = o["close"].diff()
        up = d.clip(lower=0).ewm(alpha=1 / 14, adjust=False).mean()
        dn = (-d.clip(upper=0)).ewm(alpha=1 / 14, adjust=False).mean()
        out[lab] = {
            "close": float(o["close"].iloc[-1]),
            "atr": float(tr.rolling(14).mean().iloc[-1]),
            "ema20": float(o["close"].ewm(span=20).mean().iloc[-1]),
            "ema50": float(o["close"].ewm(span=50).mean().iloc[-1]) if len(o) >= 50 else None,
            "rsi": float(100 - 100 / (1 + up.iloc[-1] / dn.iloc[-1])) if dn.iloc[-1] > 0 else 100.0,
            "swing_high": float(o["high"].iloc[-12:].max()),
            "swing_low": float(o["low"].iloc[-12:].min()),
        }
    return out


def trend_label(ind: dict, tf: str) -> str:
    x = ind.get(tf)
    if not x or x["ema50"] is None:
        return "indéterminée"
    if x["close"] > x["ema20"] > x["ema50"]:
        return "haussière"
    if x["close"] < x["ema20"] < x["ema50"]:
        return "baissière"
    return "neutre"


# ============================================================================ POLYMARKET
class Market:
    __slots__ = ("token", "market_id", "question", "category", "prior", "volume24h", "event_title",
                 "hist", "last_jump_ts")

    def __init__(self, token, market_id, question, category, prior, volume24h, event_title):
        self.token, self.market_id, self.question = token, market_id, question
        self.category, self.prior, self.volume24h, self.event_title = category, prior, volume24h, event_title
        self.hist: deque = deque(maxlen=6000)  # (ts, p), ~4 jours à 1/min
        self.last_jump_ts = 0.0

    def series(self) -> pd.Series:
        if not self.hist:
            return pd.Series(dtype=float)
        ts, p = zip(*self.hist)
        return pd.Series(p, index=pd.to_datetime(ts, unit="s", utc=True))


class PolymarketFeed:
    def __init__(self):
        self.markets: dict[str, Market] = {}
        self._lock = threading.Lock()
        self.last_poll_ok = 0.0
        self.last_discover = 0.0
        self.errors = 0
        self.s = requests.Session()

    def _get(self, url, params, retries=4):
        delay = 1.0
        for _ in range(retries):
            try:
                r = self.s.get(url, params=params, headers=UA, timeout=30)
                if r.status_code == 200:
                    return r.json()
            except requests.RequestException:
                pass
            time.sleep(delay)
            delay *= 2
        return None

    def discover(self) -> int:
        from research.labels import prior_direction
        found: dict[str, Market] = {}
        for cat, tags in CFG.categories.items():
            for tag in tags:
                evs = self._get(f"{GAMMA}/events", {"tag_slug": tag, "closed": "false", "active": "true",
                                                    "limit": 100, "order": "volume24hr", "ascending": "false"}) or []
                for e in evs:
                    if (e.get("volume") or 0) < CFG.min_event_volume:
                        continue
                    etags = {t.get("slug") for t in e.get("tags") or []}
                    if etags & {"gold", "up-or-down", "15M", "hit-price", "crypto", "sports"}:
                        continue
                    for m in e.get("markets") or []:
                        if m.get("closed") or not m.get("acceptingOrders"):
                            continue
                        if float(m.get("volume24hr") or 0) < CFG.min_market_volume24h:
                            continue
                        try:
                            outs, toks = json.loads(m["outcomes"]), json.loads(m["clobTokenIds"])
                        except (KeyError, json.JSONDecodeError):
                            continue
                        if outs[:1] != ["Yes"] or len(toks) != 2 or toks[0] in found:
                            continue
                        prior = prior_direction(m.get("question", ""))[0]
                        if prior == 0 and cat != "fed":  # hors sujet ou ambigu (élections, etc.)
                            continue
                        found[toks[0]] = Market(toks[0], m["id"], m.get("question", ""), cat, prior,
                                                float(m.get("volume24hr") or 0), e.get("title", ""))
        keep = sorted(found.values(), key=lambda m: -m.volume24h)[: CFG.max_markets]
        new = [m for m in keep if m.token not in self.markets]
        with ThreadPoolExecutor(max_workers=8) as ex:
            list(ex.map(self._bootstrap, new))
        with self._lock:
            old = self.markets
            self.markets = {m.token: old.get(m.token, m) for m in keep}
            for m in keep:  # met à jour les volumes
                self.markets[m.token].volume24h = m.volume24h
        self.last_discover = time.time()
        log.info("polymarket: %d marchés surveillés (%d nouveaux)", len(self.markets), len(new))
        return len(self.markets)

    def _bootstrap(self, m: Market) -> None:
        end = int(time.time())
        d = self._get(f"{CLOB}/prices-history", {"market": m.token, "startTs": end - 3 * 86400,
                                                 "endTs": end, "fidelity": 5})
        for pt in (d or {}).get("history", []):
            m.hist.append((float(pt["t"]), float(pt["p"])))

    def poll(self) -> int:
        with self._lock:
            toks = list(self.markets)
        now, n = time.time(), 0
        for i in range(0, len(toks), 100):
            chunk = toks[i:i + 100]
            try:
                r = self.s.post(f"{CLOB}/midpoints", json=[{"token_id": t} for t in chunk], headers=UA, timeout=30)
                r.raise_for_status()
                mids = r.json()
            except Exception as e:  # noqa: BLE001
                self.errors += 1
                log.warning("polymarket: échec midpoints (%s)", e)
                return n
            for t, p in mids.items():
                m = self.markets.get(t)
                if m is not None and p is not None:
                    m.hist.append((now, float(p)))
                    n += 1
        self.errors = 0
        self.last_poll_ok = now
        return n


def logit(p: float) -> float:
    p = min(max(p, 0.01), 0.99)
    return math.log(p / (1 - p))


def five_min_logit_diffs(s: pd.Series) -> pd.Series:
    if s.empty:
        return s
    g = s.resample("5min").last().ffill()
    q = g.clip(0.01, 0.99)
    return np.log(q / (1 - q)).diff().dropna()
