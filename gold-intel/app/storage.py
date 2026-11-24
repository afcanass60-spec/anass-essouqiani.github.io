"""Persistance SQLite : prix, alertes, trades papier, état."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS gold_ticks (ts REAL PRIMARY KEY, bid REAL, ask REAL);
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL, kind TEXT, priority TEXT, dedupe_key TEXT,
    category TEXT, direction TEXT, text TEXT, payload TEXT, sent INTEGER, error TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS alerts_dedupe ON alerts(dedupe_key);
CREATE TABLE IF NOT EXISTS paper_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT, alert_id INTEGER, opened_ts REAL, category TEXT,
    direction TEXT, entry REAL, sl REAL, tp REAL, closed_ts REAL, exit REAL, outcome TEXT, r_multiple REAL);
CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT);
"""


class Store:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(path, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._db.executescript(SCHEMA)

    def _x(self, sql: str, args: tuple = ()):
        with self._lock:
            cur = self._db.execute(sql, args)
            self._db.commit()
            return cur

    # --- état clé/valeur
    def get(self, k: str, default=None):
        row = self._x("SELECT v FROM kv WHERE k=?", (k,)).fetchone()
        return json.loads(row["v"]) if row else default

    def set(self, k: str, v) -> None:
        self._x("INSERT OR REPLACE INTO kv(k, v) VALUES(?, ?)", (k, json.dumps(v)))

    # --- prix
    def add_tick(self, ts: float, bid: float, ask: float) -> None:
        self._x("INSERT OR IGNORE INTO gold_ticks VALUES(?,?,?)", (ts, bid, ask))

    def ticks_since(self, ts: float) -> list[sqlite3.Row]:
        return self._x("SELECT * FROM gold_ticks WHERE ts>=? ORDER BY ts", (ts,)).fetchall()

    def prune_ticks(self, older_than_s: float = 10 * 86400) -> None:
        self._x("DELETE FROM gold_ticks WHERE ts<?", (time.time() - older_than_s,))

    # --- alertes
    def add_alert(self, kind, priority, dedupe_key, category, direction, text, payload) -> int | None:
        try:
            cur = self._x("INSERT INTO alerts(ts,kind,priority,dedupe_key,category,direction,text,payload,sent)"
                          " VALUES(?,?,?,?,?,?,?,?,0)",
                          (time.time(), kind, priority, dedupe_key, category, direction, text,
                           json.dumps(payload, default=str)))
            return cur.lastrowid
        except sqlite3.IntegrityError:
            return None  # doublon : déjà alerté

    def mark_sent(self, alert_id: int, ok: bool, error: str = "") -> None:
        self._x("UPDATE alerts SET sent=?, error=? WHERE id=?", (1 if ok else 0, error, alert_id))

    def last_alert(self, kind: str | None = None):
        if kind:
            return self._x("SELECT * FROM alerts WHERE kind=? ORDER BY id DESC LIMIT 1", (kind,)).fetchone()
        return self._x("SELECT * FROM alerts ORDER BY id DESC LIMIT 1").fetchone()

    def count_alerts(self, since: float) -> int:
        return self._x("SELECT COUNT(*) n FROM alerts WHERE ts>=?", (since,)).fetchone()["n"]

    # --- trades papier
    def open_trade(self, alert_id, category, direction, entry, sl, tp) -> int:
        return self._x("INSERT INTO paper_trades(alert_id,opened_ts,category,direction,entry,sl,tp)"
                       " VALUES(?,?,?,?,?,?,?)", (alert_id, time.time(), category, direction, entry, sl, tp)).lastrowid

    def open_trades(self) -> list[sqlite3.Row]:
        return self._x("SELECT * FROM paper_trades WHERE closed_ts IS NULL").fetchall()

    def close_trade(self, tid: int, exit_px: float, outcome: str, r: float) -> None:
        self._x("UPDATE paper_trades SET closed_ts=?, exit=?, outcome=?, r_multiple=? WHERE id=?",
                (time.time(), exit_px, outcome, r, tid))

    def closed_trades(self) -> list[sqlite3.Row]:
        return self._x("SELECT * FROM paper_trades WHERE closed_ts IS NOT NULL ORDER BY id").fetchall()
