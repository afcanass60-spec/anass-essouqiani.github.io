#!/usr/bin/env python3
"""XQAI web dashboard (standard library only).

Reads the files written by the EA in <MT5 Common>/Files/XQAI and serves:
    /                 dashboard page
    /api/status       status.json (account, risk, signal, AI state)
    /api/trades       journal_trades.csv as JSON
    /api/decisions    last decisions (journal_decisions.csv)
    /api/stop  POST   creates the STOP kill-switch file (requires the token)

    python dashboard/server.py --port 8050 --token <secret>
    python dashboard/server.py --tester        # read the *_tester files

Bind address defaults to 127.0.0.1: on a VPS, reach it through an SSH tunnel
or RDP, never expose it publicly.
"""
from __future__ import annotations

import argparse
import csv
import hmac
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
from xqai.bridge.protocol import default_common_dir  # noqa: E402

STATIC = Path(__file__).resolve().parent / "static"


def read_csv(path: Path, limit: int = 0) -> list:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8", errors="replace") as fh:
        rows = list(csv.DictReader(fh))
    return rows[-limit:] if limit else rows


def summarise(trades: list) -> dict:
    closes = [t for t in trades if t.get("event") == "CLOSE"]
    pnl = [float(t.get("pnl") or 0) for t in closes]
    wins = [p for p in pnl if p > 0]
    losses = [-p for p in pnl if p <= 0]
    return {"closed": len(pnl), "win_rate": 100 * len(wins) / len(pnl) if pnl else 0.0,
            "profit_factor": (sum(wins) / sum(losses)) if losses and sum(losses) > 0 else None,
            "net": sum(pnl), "avg_r": (sum(float(t.get("r") or 0) for t in closes) / len(closes)) if closes else 0.0}


class Handler(BaseHTTPRequestHandler):
    folder: Path = default_common_dir()
    suffix: str = ""
    token: str = ""

    def _send(self, code: int, body: bytes, ctype: str = "application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code=200):
        self._send(code, json.dumps(obj).encode())

    def log_message(self, fmt, *args):  # quiet
        pass

    def do_GET(self):
        f = self.folder
        if self.path in ("/", "/index.html"):
            return self._send(200, (STATIC / "index.html").read_bytes(), "text/html; charset=utf-8")
        if self.path == "/api/status":
            p = f / f"status{self.suffix}.json"
            if not p.exists():
                return self._json({"error": f"{p} not found - is the EA running?"}, 404)
            try:
                return self._json(json.loads(p.read_text(encoding="utf-8", errors="replace")))
            except json.JSONDecodeError:
                return self._json({"error": "status file being written, retry"}, 503)
        if self.path == "/api/trades":
            trades = read_csv(f / f"journal_trades{self.suffix}.csv")
            return self._json({"trades": trades[-500:], "summary": summarise(trades)})
        if self.path == "/api/decisions":
            return self._json({"decisions": read_csv(f / f"journal_decisions{self.suffix}.csv", 200)})
        return self._json({"error": "not found"}, 404)

    def do_POST(self):
        if self.path != "/api/stop":
            return self._json({"error": "not found"}, 404)
        n = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(n) or b"{}")
        except json.JSONDecodeError:
            body = {}
        if not self.token or not hmac.compare_digest(str(body.get("token", "")), self.token):
            return self._json({"error": "invalid token (start the server with --token)"}, 403)
        (self.folder / "STOP").write_text("stop requested from dashboard\n")
        return self._json({"ok": True, "message": "STOP file written: the EA closes its positions and halts"})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=str(default_common_dir()))
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8050)
    ap.add_argument("--token", default=os.environ.get("XQAI_DASH_TOKEN", ""))
    ap.add_argument("--tester", action="store_true", help="read the Strategy Tester files")
    a = ap.parse_args()
    Handler.folder = Path(a.dir)
    Handler.suffix = "_tester" if a.tester else ""
    Handler.token = a.token
    print(f"XQAI dashboard on http://{a.host}:{a.port}  (data: {Handler.folder})")
    ThreadingHTTPServer((a.host, a.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
