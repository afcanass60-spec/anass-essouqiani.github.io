"""Moteur : anomalies Polymarket -> contexte -> confirmation par l'or -> signal / PAS DE TRADE.

Règles (issues de la recherche Phase 0/0b) :
1. Un saut Polymarket n'est JAMAIS à lui seul un ordre d'achat/vente : il déclenche une alerte
   CONTEXTE (nouvelle en cours, volatilité attendue en hausse).
2. Un signal BUY/SELL n'est émis que si l'or CONFIRME par son propre mouvement après le saut
   (>= 0,5 ATR M15 dans les 15-30 min) ET si la tendance M15 va dans le même sens.
   Le sens « intuitif » (escalade = or +) n'est qu'informatif : il s'est inversé en 2026.
3. Niveaux : SL = 1,5 ATR M15 au-delà de l'entrée (et au-delà du dernier swing),
   TP = 2 × risque. Une seule position papier ouverte à la fois.
4. Confiance : non calibrée tant que le paper trading n'a pas au moins 30 trades clôturés ;
   ensuite, taux de réussite mesuré affiché.
"""

from __future__ import annotations

import logging
import math
import time
from dataclasses import dataclass, field

import numpy as np

from app.config import CAT_FR, CFG, RESEARCH_NOTES
from app.feeds import GoldFeed, PolymarketFeed, five_min_logit_diffs, indicators, logit, trend_label
from app.storage import Store

log = logging.getLogger("engine")


@dataclass
class Jump:
    ts: float
    market: object
    p_before: float
    p_now: float
    dlogit: float
    z: float


@dataclass
class Cluster:
    id: str
    t0: float
    jumps: list = field(default_factory=list)
    gold_t0: float | None = None
    gold_open_t0: bool = False
    reference_ts: float | None = None     # instant de référence pour la confirmation (t0 ou réouverture)
    gold_ref: float | None = None
    done: bool = False
    big_update_sent: bool = False

    @property
    def push(self) -> float:
        return sum(j.market.prior * j.dlogit for j in self.jumps)

    @property
    def categories(self) -> list[str]:
        out: dict[str, float] = {}
        for j in self.jumps:
            out[j.market.category] = out.get(j.market.category, 0) + abs(j.p_now - j.p_before)
        return sorted(out, key=lambda c: -out[c])

    @property
    def priority(self) -> str:
        n = len({j.market.token for j in self.jumps})
        mx = max(abs(j.p_now - j.p_before) for j in self.jumps)
        vol = max(j.market.volume24h for j in self.jumps)
        if n >= 3 or (mx >= 0.15 and vol >= 200_000):
            return "HAUTE"
        if vol >= 50_000:
            return "MOYENNE"
        return "BASSE"


class Engine:
    def __init__(self, store: Store, gold: GoldFeed, pm: PolymarketFeed, notify):
        self.store, self.gold, self.pm, self.notify = store, gold, pm, notify
        self.cluster: Cluster | None = None
        self.pending: list[Cluster] = []

    # ------------------------------------------------------------------ détection
    def detect(self, now: float | None = None) -> list[Jump]:
        now = now or time.time()
        jumps = []
        for m in list(self.pm.markets.values()):
            if len(m.hist) < 30 or now - m.last_jump_ts < CFG.market_cooldown_min * 60:
                continue
            s = m.series()
            p_now = float(s.iloc[-1])
            before = s[s.index <= s.index[-1] - np.timedelta64(5, "m")]
            if before.empty:
                continue
            p_before = float(before.iloc[-1])
            if not 0.03 <= p_before <= 0.97:
                continue
            dl = logit(p_now) - logit(p_before)
            diffs = five_min_logit_diffs(s.iloc[:-1])
            vol = float(diffs.ewm(halflife=288, min_periods=50).std().iloc[-1]) if len(diffs) >= 50 else float("nan")
            z = dl / max(vol, 0.01) if math.isfinite(vol) else 0.0
            if abs(p_now - p_before) >= CFG.jump_dp and abs(dl) >= CFG.jump_dlogit and abs(z) >= CFG.jump_z:
                m.last_jump_ts = now
                jumps.append(Jump(now, m, p_before, p_now, dl, z))
        return jumps

    # ------------------------------------------------------------------ boucle
    def step(self, now: float | None = None) -> None:
        now = now or time.time()
        jumps = self.detect(now)
        if jumps:
            self._on_jumps(jumps, now)
        self._confirmations(now)
        self.paper_update()

    def _on_jumps(self, jumps: list[Jump], now: float) -> None:
        c = self.cluster
        if c is not None and now - max(j.ts for j in c.jumps) <= CFG.cluster_min * 60:
            c.jumps.extend(jumps)
            if not c.big_update_sent and len({j.market.token for j in c.jumps}) >= 3:
                c.big_update_sent = True
                self._send_context(c, update=True)
            return
        c = Cluster(id=f"{int(now)}", t0=now, jumps=list(jumps))
        c.gold_t0 = self.gold.mid
        c.gold_open_t0 = self.gold.is_open()
        if c.gold_open_t0:
            c.reference_ts, c.gold_ref = now, self.gold.mid
        self.cluster = c
        self.pending.append(c)
        self._send_context(c)

    # ------------------------------------------------------------------ confirmation par l'or
    def _confirmations(self, now: float) -> None:
        for c in list(self.pending):
            if c.done:
                self.pending.remove(c)
                continue
            if c.reference_ts is None:          # or fermé au moment du saut : on attend la réouverture
                if self.gold.is_open():
                    c.reference_ts, c.gold_ref = now, self.gold.mid
                continue
            age = (now - c.reference_ts) / 60
            if age < CFG.confirm_after_min[0]:
                continue
            verdict = self.evaluate(c)
            if verdict["signal"] in ("BUY", "SELL") or age >= CFG.confirm_after_min[-1]:
                c.done = True
                self._send_signal(c, verdict)

    def evaluate(self, c: Cluster) -> dict:
        ind = indicators(self.gold.m1(72))
        px = self.gold.mid
        out = {"signal": "PAS DE TRADE", "raison": "", "ind": ind, "px": px}
        if not ind.get("M15") or px is None or c.gold_ref is None:
            out["raison"] = "Données de prix insuffisantes (échauffement en cours ou flux interrompu)."
            return out
        if not self.gold.is_open():
            out["raison"] = "Marché de l'or fermé."
            return out
        atr = ind["M15"]["atr"]
        move = px - c.gold_ref
        out["move"], out["atr"] = move, atr
        if abs(move) < CFG.confirm_atr_frac * atr:
            out["raison"] = (f"L'or n'a pas confirmé : {move:+.2f} $ depuis le saut, "
                             f"< {CFG.confirm_atr_frac} ATR M15 ({atr:.2f} $).")
            return out
        d = 1 if move > 0 else -1
        tr = trend_label(ind, "M15")
        if (d == 1 and tr == "baissière") or (d == -1 and tr == "haussière"):
            out["raison"] = f"Réaction de l'or ({move:+.2f} $) contraire à la tendance M15 ({tr})."
            return out
        if self.store.open_trades():
            out["raison"] = "Une position papier est déjà ouverte (une seule à la fois)."
            return out
        entry = self.gold.last_ask if d == 1 else self.gold.last_bid
        risk = CFG.sl_atr_mult * atr
        if d == 1:
            sl = min(entry - risk, ind["M15"]["swing_low"] - 0.1 * atr)
        else:
            sl = max(entry + risk, ind["M15"]["swing_high"] + 0.1 * atr)
        r = abs(entry - sl)
        tp = entry + d * CFG.rr * r
        out.update(signal="BUY" if d == 1 else "SELL", entry=entry, sl=sl, tp=tp, risk=r, trend=tr)
        prior = np.sign(c.push)
        out["contre_intuition"] = bool(prior != 0 and prior != d)
        return out

    # ------------------------------------------------------------------ messages
    def _send_context(self, c: Cluster, update: bool = False) -> None:
        from app import messages
        text = messages.context(c, self.gold, update)
        prio = "HAUTE" if update else c.priority
        key = f"ctx:{c.id}:{'upd' if update else 'new'}"
        self.notify(kind="CONTEXTE", priority=prio, dedupe_key=key, category=c.categories[0],
                    direction="NEUTRE", text=text, payload={"cluster": c.id})

    def _send_signal(self, c: Cluster, v: dict) -> None:
        from app import messages
        if v["signal"] == "PAS DE TRADE" and c.priority != "HAUTE":
            log.info("pas de trade (cluster %s, priorité %s) : %s", c.id, c.priority, v["raison"])
            return
        text = messages.signal(c, v, self.performance())
        aid = self.notify(kind="SIGNAL", priority="HAUTE" if v["signal"] != "PAS DE TRADE" else "MOYENNE",
                          dedupe_key=f"sig:{c.id}", category=c.categories[0], direction=v["signal"],
                          text=text, payload={k: v.get(k) for k in ("entry", "sl", "tp", "move", "atr")})
        if v["signal"] in ("BUY", "SELL") and aid:
            self.store.open_trade(aid, c.categories[0], v["signal"], v["entry"], v["sl"], v["tp"])

    # ------------------------------------------------------------------ paper trading
    def paper_update(self) -> None:
        bid, ask = self.gold.last_bid, self.gold.last_ask
        if bid is None:
            return
        from app import messages
        for t in self.store.open_trades():
            d = 1 if t["direction"] == "BUY" else -1
            px = bid if d == 1 else ask
            risk = abs(t["entry"] - t["sl"])
            outcome = None
            if (d == 1 and px <= t["sl"]) or (d == -1 and px >= t["sl"]):
                outcome, exit_px = "STOP", t["sl"]
            elif (d == 1 and px >= t["tp"]) or (d == -1 and px <= t["tp"]):
                outcome, exit_px = "OBJECTIF", t["tp"]
            elif time.time() - t["opened_ts"] > CFG.trade_timeout_h * 3600:
                outcome, exit_px = "EXPIRÉ", px
            if outcome:
                r = d * (exit_px - t["entry"]) / risk if risk else 0.0
                self.store.close_trade(t["id"], exit_px, outcome, r)
                self.notify(kind="CLOTURE", priority="BASSE", dedupe_key=f"close:{t['id']}",
                            category=t["category"], direction=t["direction"],
                            text=messages.closed(t, outcome, exit_px, r), payload={})

    def performance(self) -> dict:
        tr = self.store.closed_trades()
        n = len(tr)
        if not n:
            return {"n": 0}
        rs = [t["r_multiple"] for t in tr]
        wins = [x for x in rs if x > 0]
        losses = [-x for x in rs if x < 0]
        eq = np.cumsum(rs)
        return {"n": n, "taux_gain": len(wins) / n, "r_moyen": float(np.mean(rs)),
                "profit_factor": (sum(wins) / sum(losses)) if losses else None,
                "drawdown_r": float((eq - np.maximum.accumulate(eq)).min()),
                "par_categorie": {CAT_FR.get(c, c): sum(1 for t in tr if t["category"] == c)
                                  for c in {t["category"] for t in tr}}}

    @staticmethod
    def research_note(cat: str) -> str:
        return RESEARCH_NOTES.get(cat, "")
