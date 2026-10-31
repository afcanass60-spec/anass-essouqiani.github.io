"""File protocol between the EA (Include/Bridge.mqh) and the Python AI service.

Why files rather than sockets/ZeroMQ: MQL5 file I/O in the terminal *Common*
folder works on every MT5 build, needs no DLL import (DLLs are often forbidden
by brokers/VPS and disable the Market), survives restarts of either side and
can be inspected by hand.  Latency is ~100-300 ms, irrelevant for decisions
taken once per M5 bar.

Folder: <MT5 Common>/Files/XQAI/   (Windows: %APPDATA%/MetaQuotes/Terminal/Common/Files/XQAI)

  req_<seq>.csv     EA -> Py : seq,epoch,symbol,strategy,dir,f0,...,f39
  resp_<seq>.csv    Py -> EA : seq,prob,model_id,status      status in {OK, REJECT}
  heartbeat.txt     Py -> EA : epoch,model_id,status         rewritten every 2 s
  status.json       EA -> dashboard (account / risk / signal snapshot)
  journal_*.csv     EA -> dashboard (decisions and trades)
  STOP              anyone -> EA : kill switch (EA closes positions and halts)

Writers create ``name.tmp`` then rename, so a reader never sees a partial file.
"""
from __future__ import annotations

import os
import time
from pathlib import Path

N_FEATURES = 40


def default_common_dir() -> Path:
    appdata = os.environ.get("APPDATA")
    if appdata:
        return Path(appdata) / "MetaQuotes" / "Terminal" / "Common" / "Files" / "XQAI"
    return Path.home() / ".xqai_common" / "XQAI"


def atomic_write(path: Path, text: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text)
    os.replace(tmp, path)


def parse_request(text: str):
    parts = text.strip().split(",")
    if len(parts) != 5 + N_FEATURES:
        raise ValueError(f"expected {5 + N_FEATURES} fields, got {len(parts)}")
    seq, epoch, symbol, strategy, d = parts[:5]
    feats = [float(x) for x in parts[5:]]
    return {"seq": int(seq), "epoch": int(epoch), "symbol": symbol, "strategy": strategy, "dir": int(d),
            "features": feats}


def format_response(seq: int, prob: float, model_id: str, status: str) -> str:
    return f"{seq},{prob:.6f},{model_id},{status}\n"


def format_heartbeat(model_id: str, status: str) -> str:
    return f"{int(time.time())},{model_id},{status}\n"
