"""Gold Intel — programme principal.

    python -m app.main            # fonctionnement normal (Telegram)
    DRY_RUN=1 python -m app.main  # affiche les alertes dans le terminal au lieu de les envoyer

Mode analyse + paper trading uniquement : aucun ordre réel n'est jamais passé.
"""

from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone

from app.config import CAT_FR, CFG
from app.engine import Engine
from app.feeds import GoldFeed, PolymarketFeed, indicators, trend_label
from app.storage import Store
from app.telegram import CommandLoop, Notifier, Telegram, fmt_age, utc

log = logging.getLogger("main")


class App:
    def __init__(self):
        self.store = Store(CFG.db_path)
        self.tg = Telegram(CFG.telegram_token, CFG.telegram_chat_id, CFG.dry_run)
        self.notify = Notifier(self.store, self.tg)
        self.gold = GoldFeed(self.store)
        self.pm = PolymarketFeed()
        self.engine = Engine(self.store, self.gold, self.pm, self.notify)
        self.started = time.time()
        self.health = {"gold": True, "pm": True}

    # ------------------------------------------------------------------ commandes
    def cmd_start(self) -> str:
        return ("👋 <b>Gold Intel</b> actif (paper trading).\n"
                "Je surveille Polymarket et XAUUSD et je t'alerte :\n"
                "🌍 CONTEXTE : nouvelle majeure détectée (pas d'ordre)\n"
                "🟢/🔴 SIGNAL : uniquement si l'or confirme\n"
                "⏸ PAS DE TRADE : conditions non réunies\n\n"
                "/status /lastsignal /performance /pause /resume")

    def cmd_status(self) -> str:
        ind = indicators(self.gold.m1(72))
        cats: dict[str, int] = {}
        for m in self.pm.markets.values():
            cats[m.category] = cats.get(m.category, 0) + 1
        lines = [
            "<b>📊 Statut</b>",
            f"Alertes : {'⏸ EN PAUSE' if self.notify.paused else '▶️ actives'}",
            f"Démarré : {utc(self.started)}", "",
            f"<b>XAUUSD</b> {self.gold.mid:.2f} $ · marché {'ouvert' if self.gold.is_open() else 'fermé'}"
            if self.gold.mid else "<b>XAUUSD</b> indisponible",
            f"Dernière cotation : {fmt_age(self.gold.last_ok)}",
            f"Tendance M15 {trend_label(ind, 'M15')} · H1 {trend_label(ind, 'H1')} · H4 {trend_label(ind, 'H4')}"
            if ind else "Indicateurs : échauffement en cours",
            "", f"<b>Polymarket</b> : {len(self.pm.markets)} marchés surveillés",
            f"Dernière lecture : {fmt_age(self.pm.last_poll_ok)} · découverte {fmt_age(self.pm.last_discover)}",
        ]
        lines += [f"• {CAT_FR.get(k, k)} : {v}" for k, v in sorted(cats.items(), key=lambda x: -x[1])]
        lines += ["", f"Alertes 24 h : {self.store.count_alerts(time.time() - 86400)} · "
                  f"positions papier ouvertes : {len(self.store.open_trades())}"]
        return "\n".join(lines)

    def cmd_lastsignal(self) -> str:
        a = self.store.last_alert("SIGNAL") or self.store.last_alert("CONTEXTE")
        return a["text"] if a else "Aucun signal pour l'instant."

    def cmd_performance(self) -> str:
        p = self.engine.performance()
        if not p["n"]:
            return "Aucun trade papier clôturé pour l'instant."
        pf = f"{p['profit_factor']:.2f}" if p["profit_factor"] else "∞"
        cats = "\n".join(f"• {k} : {v}" for k, v in p["par_categorie"].items())
        return (f"<b>📈 Performance papier</b>\nTrades clôturés : {p['n']}\n"
                f"Réussite : {p['taux_gain']:.0%}\nR moyen : {p['r_moyen']:+.2f}\n"
                f"Profit factor : {pf}\nDrawdown max : {p['drawdown_r']:.1f} R\n\n{cats}\n\n"
                + ("<i>Moins de 30 trades : statistiques non fiables.</i>" if p["n"] < 30 else ""))

    def cmd_pause(self) -> str:
        self.store.set("paused", True)
        return "⏸ Alertes en pause (la surveillance continue). /resume pour reprendre."

    def cmd_resume(self) -> str:
        self.store.set("paused", False)
        return "▶️ Alertes réactivées."

    # ------------------------------------------------------------------ santé
    def check_health(self) -> None:
        now = datetime.now(timezone.utc)
        # Heures où l'or devrait coter (approx. dim 23:00 → ven 21:00 UTC, hors pause 21-22 UTC).
        wd, h = now.weekday(), now.hour
        expected_open = not (wd == 5 or (wd == 6 and h < 23) or (wd == 4 and h >= 21) or h == 21)
        gold_ok = (time.time() - self.gold.last_ok) < CFG.gold_stale_s and (
            self.gold.is_open() or not expected_open)
        pm_ok = self.pm.errors < 5 and (time.time() - self.pm.last_poll_ok) < 10 * CFG.pm_poll_s
        for name, ok, label in [("gold", gold_ok, "flux XAUUSD"), ("pm", pm_ok, "flux Polymarket")]:
            if ok != self.health[name]:
                self.health[name] = ok
                stamp = int(time.time() // 60)
                self.notify.system(f"health:{name}:{stamp}",
                                   f"✅ {label} rétabli." if ok else
                                   f"⚠️ <b>{label} interrompu</b> : analyses non fiables tant qu'il n'est pas rétabli.")

    # ------------------------------------------------------------------ boucle
    def run(self) -> None:
        logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
        log.info("démarrage (dry_run=%s)", CFG.dry_run)
        self.gold.poll()
        try:
            self.gold.warmup_from_dukascopy(3)
        except Exception as e:  # noqa: BLE001
            log.warning("échauffement Dukascopy impossible (%s) : indicateurs disponibles après ~4 h", e)
        self.pm.discover()
        CommandLoop(self.tg, self).start()
        self.notify.system(f"boot:{int(self.started)}",
                           f"🚀 Gold Intel démarré — {len(self.pm.markets)} marchés Polymarket surveillés, "
                           f"XAUUSD {self.gold.mid:.2f} $." if self.gold.mid else "🚀 Gold Intel démarré.")
        t_gold = t_pm = 0.0
        while True:
            now = time.time()
            if now - t_gold >= CFG.gold_poll_s:
                self.gold.poll()
                self.engine.paper_update()
                t_gold = now
            if now - t_pm >= CFG.pm_poll_s:
                self.pm.poll()
                try:
                    self.engine.step(now)
                except Exception:  # noqa: BLE001
                    log.exception("erreur moteur")
                self.check_health()
                t_pm = now
            if now - self.pm.last_discover >= CFG.pm_discover_s:
                threading.Thread(target=self.pm.discover, daemon=True).start()
                self.pm.last_discover = now
                self.store.prune_ticks()
            time.sleep(1)


if __name__ == "__main__":
    App().run()
