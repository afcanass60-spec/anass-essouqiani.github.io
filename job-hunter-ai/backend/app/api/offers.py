from __future__ import annotations

import hashlib
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..connectors.base import ConnectorError
from ..connectors.others import import_from_url
from ..db import get_db
from ..deps import current_user
from ..models import JobOffer, User
from ..services.filters import OfferFilters, build_query, within_radius
from ..services.ingest import ingest
from ..services.normalize import RawJob
from ..services.pipeline import get_profile
from ..services.scoring import score_offer
from ..services.urlsafe import UnsafeURLError
from .serializers import offer_out

router = APIRouter(prefix="/api/offers", tags=["offers"])


def _own(db: Session, user: User, offer_id: int) -> JobOffer:
    o = db.get(JobOffer, offer_id)
    if not o or o.user_id != user.id:
        raise HTTPException(404, "Offre introuvable")
    return o


@router.post("/search")
def search(f: OfferFilters, user: User = Depends(current_user), db: Session = Depends(get_db)):
    stmt, pts = build_query(user.id, f)
    if pts:
        rows = [o for o in db.scalars(stmt.limit(3000)).all() if within_radius(o, pts, f.radius_km)]
        total = len(rows)
        rows = rows[(f.page - 1) * f.page_size: f.page * f.page_size]
    else:
        total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
        rows = db.scalars(stmt.offset((f.page - 1) * f.page_size).limit(f.page_size)).all()
    return {"total": total, "page": f.page, "page_size": f.page_size, "items": [offer_out(o) for o in rows]}


@router.get("/{offer_id}")
def get_offer(offer_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return offer_out(_own(db, user, offer_id), detail=True)


class StatusIn(BaseModel):
    status: Literal["new", "saved", "ignored", "applied"]


@router.patch("/{offer_id}/status")
def set_status(offer_id: int, body: StatusIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    o = _own(db, user, offer_id)
    o.status = body.status
    db.commit()
    return offer_out(o)


@router.post("/{offer_id}/analyze")
def analyze(offer_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Analyse d'adéquation complète (règles + IA si configurée)."""
    o = _own(db, user, offer_id)
    score_offer(o, get_profile(db, user.id), use_llm=True)
    db.commit()
    return offer_out(o, detail=True)


class ManualImport(BaseModel):
    url: str | None = Field(None, max_length=1000)
    title: str | None = Field(None, max_length=300)
    company: str | None = Field(None, max_length=200)
    location: str | None = Field(None, max_length=200)
    contract: str | None = Field(None, max_length=100)
    salary: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=60000)
    source: str = Field("manual", max_length=40)


@router.post("/import")
def manual_import(body: ManualImport, user: User = Depends(current_user), db: Session = Depends(get_db)):
    profile = get_profile(db, user.id)
    if body.description and body.title:
        ext = hashlib.sha1(f"{body.url}{body.title}{body.company}".encode()).hexdigest()[:20]
        raws = [RawJob(source=body.source if body.source in ("manual", "linkedin", "indeed", "welcome_to_the_jungle", "apec", "hellowork", "jobteaser", "meteojob", "chooseyourboss") else "manual",
                       external_id=ext, title=body.title, company=body.company or "", description=body.description, url=body.url,
                       location_label=body.location or "", city=(body.location or "").split(",")[0].strip() or None,
                       contract_hint=body.contract or "", salary_text=body.salary)]
    elif body.url:
        try:
            raws = import_from_url(body.url)
        except (ConnectorError, UnsafeURLError) as e:
            raise HTTPException(422, str(e)) from e
    else:
        raise HTTPException(422, "Fournissez une URL ou un intitulé + une description")
    results = []
    for raw in raws[:20]:
        status, offer = ingest(db, user.id, raw, profile, use_llm=True)
        db.flush()
        results.append({"status": status, "offer": offer_out(offer)})
    db.commit()
    return {"imported": results}


@router.post("/{offer_id}/complete")
def complete_details(offer_id: int, body: ManualImport, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Complète une piste (alerte email / Google) avec le texte de l'annonce collé par l'utilisateur."""
    from ..services.ingest import apply_fields, locate

    o = _own(db, user, offer_id)
    if not body.description:
        raise HTTPException(422, "Description requise")
    raw = RawJob(source="manual", external_id="", title=body.title or o.title, company=body.company or o.company,
                 description=body.description, url=o.url, location_label=body.location or o.location_label,
                 city=(body.location or o.city or "").split(",")[0].strip() or None, contract_hint=body.contract or "", salary_text=body.salary)
    status = o.status
    apply_fields(o, raw)
    o.status, o.needs_details = status, False
    profile = get_profile(db, user.id)
    locate(o, profile)
    score_offer(o, profile)
    db.commit()
    return offer_out(o, detail=True)


@router.delete("/{offer_id}")
def delete_offer(offer_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_own(db, user, offer_id))
    db.commit()
    return {"ok": True}
