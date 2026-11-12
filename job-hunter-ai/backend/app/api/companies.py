from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..connectors.ats import PROVIDERS, detect_ats
from ..db import get_db
from ..deps import current_user
from ..models import Company, JobOffer, User
from ..services.dedup import norm_company
from ..services.pipeline import watch_company
from ..services.urlsafe import UnsafeURLError, is_display_safe

router = APIRouter(prefix="/api/companies", tags=["companies"])


class CompanyIn(BaseModel):
    name: str = Field(max_length=200)
    sector: str = Field("", max_length=60)
    company_type: str = Field("", max_length=30)
    careers_url: str | None = Field(None, max_length=1000)
    ats_provider: str | None = None
    ats_slug: str | None = Field(None, max_length=200, pattern=r"^[A-Za-z0-9_\-\.]*$")
    is_favorite: bool = False
    watch: bool = False
    notes: str = Field("", max_length=5000)


def _out(c: Company, offers: int = 0) -> dict:
    return {"id": c.id, "name": c.name, "sector": c.sector, "company_type": c.company_type, "careers_url": c.careers_url,
            "ats_provider": c.ats_provider, "ats_slug": c.ats_slug, "is_favorite": c.is_favorite, "watch": c.watch,
            "last_checked_at": c.last_checked_at.isoformat() if c.last_checked_at else None, "last_check_status": c.last_check_status,
            "notes": c.notes, "offers_count": offers}


def _own(db: Session, user: User, cid: int) -> Company:
    c = db.get(Company, cid)
    if not c or c.user_id != user.id:
        raise HTTPException(404)
    return c


def _apply(c: Company, body: CompanyIn) -> None:
    if body.careers_url and not is_display_safe(body.careers_url):
        raise HTTPException(422, "URL invalide")
    if body.ats_provider and body.ats_provider not in PROVIDERS:
        raise HTTPException(422, "ATS non supporté")
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    c.name_norm = norm_company(body.name)
    if c.careers_url and not c.ats_provider:
        prov, slug = detect_ats(c.careers_url)
        if prov in PROVIDERS and slug:
            c.ats_provider, c.ats_slug = prov, slug


@router.get("")
def list_companies(user: User = Depends(current_user), db: Session = Depends(get_db)):
    counts = dict(db.execute(select(JobOffer.company_norm, func.count(JobOffer.id)).where(
        JobOffer.user_id == user.id, JobOffer.is_active.is_(True)).group_by(JobOffer.company_norm)).all())
    rows = db.scalars(select(Company).where(Company.user_id == user.id).order_by(Company.is_favorite.desc(), Company.name)).all()
    detected = db.execute(select(JobOffer.company, func.count(JobOffer.id), func.max(JobOffer.score)).where(
        JobOffer.user_id == user.id, JobOffer.is_active.is_(True), JobOffer.company != "").group_by(JobOffer.company)
        .order_by(func.count(JobOffer.id).desc()).limit(60)).all()
    known = {c.name_norm for c in rows}
    return {"items": [_out(c, counts.get(c.name_norm, 0)) for c in rows],
            "detected": [{"name": n, "offers": k, "best_score": s} for n, k, s in detected if norm_company(n) not in known],
            "providers": list(PROVIDERS)}


@router.post("")
def create(body: CompanyIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.scalar(select(Company).where(Company.user_id == user.id, Company.name_norm == norm_company(body.name))):
        raise HTTPException(409, "Entreprise déjà présente")
    c = Company(user_id=user.id)
    _apply(c, body)
    db.add(c)
    db.commit()
    return _out(c)


@router.put("/{cid}")
def update(cid: int, body: CompanyIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _own(db, user, cid)
    _apply(c, body)
    db.commit()
    return _out(c)


@router.delete("/{cid}")
def delete(cid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_own(db, user, cid))
    db.commit()
    return {"ok": True}


@router.post("/{cid}/check")
def check(cid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _own(db, user, cid)
    try:
        res = watch_company(db, c, "manual")
    except UnsafeURLError as e:
        raise HTTPException(422, str(e)) from e
    return {**res, "company": _out(c)}


class DetectIn(BaseModel):
    url: str = Field(max_length=1000)


@router.post("/detect")
def detect(body: DetectIn, user: User = Depends(current_user)):
    prov, slug = detect_ats(body.url)
    return {"provider": prov, "slug": slug, "supported": prov in PROVIDERS,
            "message": ("API publique disponible : suivi automatique des offres." if prov in PROVIDERS else
                        "Pas d'API publique : extraction des offres structurées (JSON-LD) ou détection de changement de la page.")}
