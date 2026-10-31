"""Python AI service for the EA (run on the same machine/VPS as MT5).

    python -m xqai.bridge.server --model models/xqai_model.txt
    python -m xqai.bridge.server --model models/hgb.joblib --dir "C:/Users/.../Common/Files/XQAI"

Supports the native text model (same file the EA can load itself) or any
pickled scikit-learn classifier (joblib) -- e.g. gradient boosting, which
cannot be evaluated inside MQL5.  Any error produces status REJECT: the EA
then treats the signal as NOT validated (fail-safe), never as accepted.
"""
from __future__ import annotations

import argparse
import hashlib
import logging
import math
import time
from pathlib import Path

import numpy as np

from .protocol import (N_FEATURES, atomic_write, default_common_dir, format_heartbeat, format_response,
                       parse_request)

log = logging.getLogger("xqai.bridge")


def load_model(path: str):
    p = Path(path)
    mid = hashlib.sha1(p.read_bytes()).hexdigest()[:10]
    if p.suffix in (".joblib", ".pkl"):
        import joblib
        from ..ml.models import SklearnProba
        mdl = joblib.load(p)
        return (mdl if hasattr(mdl, "predict_proba") and not hasattr(mdl, "classes_") else SklearnProba(mdl)), mid
    from ..ml.models import NativeModel
    return NativeModel(p), mid


class BridgeServer:
    def __init__(self, folder: Path, model, model_id: str, max_age_s: float = 30.0):
        self.folder, self.model, self.model_id, self.max_age_s = Path(folder), model, model_id, max_age_s
        self.folder.mkdir(parents=True, exist_ok=True)
        self.last_hb = 0.0

    def heartbeat(self, status: str = "OK"):
        atomic_write(self.folder / "heartbeat.txt", format_heartbeat(self.model_id, status))
        self.last_hb = time.time()

    def handle(self, req_path: Path) -> str:
        try:
            req = parse_request(req_path.read_text())
        except Exception as exc:                     # malformed request -> reject
            log.warning("bad request %s: %s", req_path.name, exc)
            seq = req_path.stem.split("_")[-1]
            atomic_write(self.folder / f"resp_{seq}.csv", format_response(int(seq) if seq.isdigit() else -1,
                                                                          -1.0, self.model_id, "REJECT"))
            req_path.unlink(missing_ok=True)
            return "REJECT"
        status, prob = "OK", -1.0
        feats = np.array(req["features"], float)
        if len(feats) != N_FEATURES or not np.all(np.isfinite(feats)):
            status = "REJECT"
        elif time.time() - req_path.stat().st_mtime > self.max_age_s:
            status = "REJECT"                         # stale request: the EA has already timed out
        else:
            try:
                prob = float(self.model.predict_proba(feats[None, :])[0])
                if not math.isfinite(prob) or not 0.0 <= prob <= 1.0:
                    status, prob = "REJECT", -1.0
            except Exception as exc:
                log.exception("inference failed: %s", exc)
                status = "REJECT"
        atomic_write(self.folder / f"resp_{req['seq']}.csv", format_response(req["seq"], prob, self.model_id, status))
        req_path.unlink(missing_ok=True)
        log.info("seq=%s %s dir=%s prob=%.3f %s", req["seq"], req["strategy"], req["dir"], prob, status)
        return status

    def poll_once(self):
        for p in sorted(self.folder.glob("req_*.csv")):
            self.handle(p)
        if time.time() - self.last_hb > 2.0:
            self.heartbeat()
        # remove responses never collected by the EA
        for p in self.folder.glob("resp_*.csv"):
            if time.time() - p.stat().st_mtime > 120:
                p.unlink(missing_ok=True)

    def serve(self, interval: float = 0.1):
        log.info("bridge serving %s model=%s", self.folder, self.model_id)
        self.heartbeat()
        while True:
            try:
                self.poll_once()
            except Exception:
                log.exception("bridge loop error")
                self.heartbeat("ERROR")
            time.sleep(interval)


def main():
    ap = argparse.ArgumentParser(description="XQAI Python AI bridge")
    ap.add_argument("--model", required=True)
    ap.add_argument("--dir", default=str(default_common_dir()))
    ap.add_argument("--log", default="bridge.log")
    a = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
                        handlers=[logging.FileHandler(a.log), logging.StreamHandler()])
    model, mid = load_model(a.model)
    BridgeServer(Path(a.dir), model, mid).serve()


if __name__ == "__main__":
    main()
