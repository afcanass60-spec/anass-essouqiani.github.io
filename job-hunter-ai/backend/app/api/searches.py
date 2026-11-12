from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..connectors.registry import CONNECTORS
from ..db import SessionLocal, get_db
from ..deps import current_user
from ..models import SavedSearch, SearchRun, User
from ..services.pipeline import FREQUENCIES, run_search, scheduler_status
from ..services.skills import DOMAIN_LABELS, SEARCH_KEYWORDS_BY_DOMAIN
from .serializers import run_out

router = APIRouter(prefix="/api/searches", tags=["searches"])


class SearchIn(BaseModel):
    name: str = Field(max_length=200)
    keywords: list[str] = Field(default_factory=list, max_length=30)
    sources: list[str] = Field(default_factory=list)
    params: dict[str, Any] = Field(default_factory=dict)
    frequency: Literal["manual", "6h", "daily", "weekly"] = "manual"
    enabled: bool = True


def _out(s: SavedSearch) -> dict:
    return {"id": s.id, "name": s.name, "keywords": s.keywords, "sources": s.sources, "params": s.params, "frequency": s.frequency,
            "enabled": s.enabled, "next_run_at": s.next_run_at.isoformat() if s.next_run_at else None,
            "last_run_at": s.last_run_at.isoformat() if s.last_run_at else None}


def _own(db: Session, user: User, sid: int) -> SavedSearch:
    s = db.get(SavedSearch, sid)
    if not s or s.user_id != user.id:
        raise HTTPException(404)
    return s


@router.get("")
def list_searches(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(SavedSearch).where(SavedSearch.user_id == user.id).order_by(SavedSearch.id)).all()
    return {"items": [_out(s) for s in rows], "scheduler": scheduler_status(db),
            "sources": [{"key": k, "label": c.label, "configured": c.configured()} for k, c in CONNECTORS.items()]}


@router.get("/suggestions")
def suggestions(user: User = Depends(current_user)):
    return [{"domain": d, "label": DOMAIN_LABELS[d], "keywords": kws} for d, kws in SEARCH_KEYWORDS_BY_DOMAIN.items()]


def _validate(body: SearchIn) -> None:
    unknown = [s for s in body.sources if s not in CONNECTORS]
    if unknown:
        raise HTTPException(422, f"Sources inconnues : {', '.join(unknown)}")


@router.post("")
def create(body: SearchIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _validate(body)
    s = SavedSearch(user_id=user.id, **body.model_dump())
    if s.frequency in FREQUENCIES:
        s.next_run_at = datetime.now(timezone.utc)
    db.add(s)
    db.commit()
    return _out(s)


@router.put("/{sid}")
def update(sid: int, body: SearchIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _validate(body)
    s = _own(db, user, sid)
    for k, v in body.model_dump().items():
        setattr(s, k, v)
    s.next_run_at = (s.last_run_at or datetime.now(timezone.utc)) + FREQUENCIES[s.frequency] if s.frequency in FREQUENCIES else None
    db.commit()
    return _out(s)


@router.delete("/{sid}")
def delete(sid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_own(db, user, sid))
    db.commit()
    return {"ok": True}


def _bg_run(user_id: int, sid: int, run_id: int) -> None:
    db = SessionLocal()
    try:
        s = db.get(SavedSearch, sid)
        run = db.get(SearchRun, run_id)
        try:
            run_search(db, user_id, s, "manual", run=run)
        except Exception as e:  # noqa: BLE001
            db.rollback()
            run = db.get(SearchRun, run_id)
            run.status, run.report = "failed", f"Erreur inattendue : {str(e)[:300]}"
            run.finished_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


@router.post("/{sid}/run")
def run_now(sid: int, background: BackgroundTasks, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Recherche immédiate (exécutée par l'API, sans attendre le planificateur)."""
    s = _own(db, user, sid)
    running = db.scalar(select(SearchRun).where(SearchRun.search_id == s.id, SearchRun.status == "running"))
    if running:
        raise HTTPException(409, "Une recherche est déjà en cours")
    run = SearchRun(user_id=user.id, search_id=s.id, trigger="manual", status="running")
    db.add(run)
    db.commit()
    background.add_task(_bg_run, user.id, s.id, run.id)
    return {"queued": True, "run_id": run.id}


@router.get("/runs/list")
def runs(limit: int = 30, user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(SearchRun).where(SearchRun.user_id == user.id).order_by(SearchRun.id.desc()).limit(min(limit, 100))).all()
    return [run_out(r) for r in rows]
