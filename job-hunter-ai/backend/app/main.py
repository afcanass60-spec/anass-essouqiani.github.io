from __future__ import annotations

import json
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import applications, auth, companies, dashboard, offers, profile, searches, studio
from .config import get_settings
from .db import init_db


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        data = {"ts": self.formatTime(record), "level": record.levelname, "logger": record.name, "msg": record.getMessage()}
        for k in ("request_id", "path", "status", "ms"):
            if hasattr(record, k):
                data[k] = getattr(record, k)
        if record.exc_info:
            data["exc"] = self.formatException(record.exc_info)
        return json.dumps(data, ensure_ascii=False)


def setup_logging() -> None:
    h = logging.StreamHandler()
    h.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [h]
    root.setLevel(get_settings().log_level)


log = logging.getLogger("jobhunter")


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    init_db()
    yield


settings = get_settings()
app = FastAPI(title="Job Hunter AI", version="1.0.0", lifespan=lifespan,
              docs_url=None if settings.is_production else "/api/docs", openapi_url=None if settings.is_production else "/api/openapi.json")
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=True,
                   allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Content-Type"])


@app.middleware("http")
async def request_context(request: Request, call_next):
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        log.exception("Erreur non gérée", extra={"request_id": rid, "path": request.url.path})
        response = JSONResponse({"detail": "Erreur interne", "request_id": rid}, status_code=500)
    response.headers["X-Request-ID"] = rid
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    log.info("request", extra={"request_id": rid, "path": request.url.path, "status": response.status_code,
                               "ms": round((time.perf_counter() - start) * 1000)})
    return response


for r in (auth, profile, offers, searches, companies, applications, studio, dashboard):
    app.include_router(r.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
