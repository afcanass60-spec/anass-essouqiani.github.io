"""Bot Telegram : envoi des alertes (avec reprise et anti-doublon) et commandes.

Sécurité : le token reste dans .env ; seul TELEGRAM_CHAT_ID reçoit les alertes et peut
piloter le bot. Tant que TELEGRAM_CHAT_ID est vide, /start répond avec l'identifiant à
copier dans .env (aucune autre commande n'est acceptée).
"""

from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone

import requests

from app.config import CAT_FR, CFG

log = logging.getLogger("telegram")
API = "https://api.telegram.org/bot{token}/{method}"


class Telegram:
    def __init__(self, token: str, chat_id: str, dry_run: bool = False):
        self.token, self.chat_id, self.dry_run = token, str(chat_id), dry_run
        self.s = requests.Session()

    def _call(self, method: str, **payload) -> dict:
        r = self.s.post(API.format(token=self.token, method=method), json=payload, timeout=35)
        return r.json()

    def send(self, text: str, silent: bool = False, chat_id: str | None = None) -> tuple[bool, str]:
        target = chat_id or self.chat_id
        if self.dry_run or not self.token or not target:
            print("\n" + "=" * 70 + f"\n[ALERTE{' silencieuse' if silent else ''}]\n{text}\n" + "=" * 70, flush=True)
            return True, "dry-run"
        for attempt in range(5):
            try:
                d = self._call("sendMessage", chat_id=target, text=text, parse_mode="HTML",
                               disable_notification=silent, disable_web_page_preview=True)
                if d.get("ok"):
                    return True, ""
                retry = (d.get("parameters") or {}).get("retry_after")
                if retry:  # limite de débit Telegram : on attend ce qu'il demande
                    time.sleep(int(retry) + 1)
                    continue
                return False, str(d.get("description"))
            except requests.RequestException as e:
                time.sleep(2 ** attempt)
                err = str(e)
        return False, err if "err" in locals() else "échec"


class Notifier:
    """Point d'entrée unique des alertes : anti-doublon, priorité, pause, historique."""

    def __init__(self, store, tg: Telegram):
        self.store, self.tg = store, tg

    @property
    def paused(self) -> bool:
        return bool(self.store.get("paused", False))

    def __call__(self, kind, priority, dedupe_key, category, direction, text, payload) -> int | None:
        aid = self.store.add_alert(kind, priority, dedupe_key, category, direction, text, payload)
        if aid is None:
            return None  # déjà envoyée
        if self.paused and kind in ("CONTEXTE", "SIGNAL"):
            self.store.mark_sent(aid, False, "en pause")
            return aid
        ok, err = self.tg.send(text, silent=priority == "BASSE")
        self.store.mark_sent(aid, ok, err)
        if not ok:
            log.error("envoi Telegram échoué : %s", err)
        return aid

    def system(self, key: str, text: str) -> None:
        self(kind="SYSTEME", priority="HAUTE", dedupe_key=key, category="", direction="", text=text, payload={})


class CommandLoop(threading.Thread):
    def __init__(self, tg: Telegram, app):
        super().__init__(daemon=True)
        self.tg, self.app = tg, app
        self.offset = 0

    def run(self) -> None:
        if not self.tg.token or self.tg.dry_run:
            return
        while True:
            try:
                d = self.tg._call("getUpdates", offset=self.offset, timeout=25)
                for u in d.get("result", []):
                    self.offset = u["update_id"] + 1
                    msg = u.get("message") or {}
                    self.handle(str(msg.get("chat", {}).get("id", "")), (msg.get("text") or "").strip())
            except Exception as e:  # noqa: BLE001
                log.warning("getUpdates : %s", e)
                time.sleep(5)

    def handle(self, chat: str, text: str) -> None:
        cmd = text.split()[0].split("@")[0].lower() if text else ""
        if not self.tg.chat_id:
            if cmd == "/start":
                self.tg.send(f"Ton identifiant de chat est <code>{chat}</code>.\n"
                             "Copie-le dans le fichier .env (TELEGRAM_CHAT_ID=...) puis relance le programme.",
                             chat_id=chat)
            return
        if chat != self.tg.chat_id:
            log.warning("commande ignorée d'un chat non autorisé")
            return
        reply = {"/start": self.app.cmd_start, "/status": self.app.cmd_status,
                 "/lastsignal": self.app.cmd_lastsignal, "/performance": self.app.cmd_performance,
                 "/pause": self.app.cmd_pause, "/resume": self.app.cmd_resume}.get(cmd)
        self.tg.send(reply() if reply else "Commandes : /status /lastsignal /performance /pause /resume")


def fmt_age(ts: float) -> str:
    if not ts:
        return "jamais"
    s = time.time() - ts
    return f"il y a {s:.0f} s" if s < 120 else f"il y a {s / 60:.0f} min"


def utc(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%d/%m %H:%M UTC")


__all__ = ["Telegram", "Notifier", "CommandLoop", "fmt_age", "utc", "CAT_FR", "CFG"]
