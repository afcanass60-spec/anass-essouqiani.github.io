from __future__ import annotations

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import SessionLocal, get_db
from ..deps import current_user
from ..models import JobOffer, Profile, ProfileRevision, User
from ..services import geo
from ..services.cv_import import parse_cv
from ..services.profile_data import ensure_ids, initial_profile
from ..services.scoring import score_offer

router = APIRouter(prefix="/api/profile", tags=["profile"])


class Identity(BaseModel):
    full_name: str = Field("", max_length=200)
    headline: str = Field("", max_length=300)
    email: str = Field("", max_length=200)
    phone: str = Field("", max_length=50)
    city: str = Field("", max_length=120)
    linkedin: str = Field("", max_length=300)
    website: str = Field("", max_length=300)
    driving_license: bool | None = None


class ProfileIn(BaseModel):
    identity: Identity
    summary: str = Field("", max_length=2000)
    education: list[dict[str, Any]] = Field(default_factory=list, max_length=30)
    experiences: list[dict[str, Any]] = Field(default_factory=list, max_length=40)
    skills: list[dict[str, Any]] = Field(default_factory=list, max_length=150)
    skill_notes: dict[str, str] = Field(default_factory=dict)
    certifications: list[dict[str, Any]] = Field(default_factory=list, max_length=40)
    languages: list[dict[str, Any]] = Field(default_factory=list, max_length=15)
    projects: list[dict[str, Any]] = Field(default_factory=list, max_length=40)
    interests: list[str] = Field(default_factory=list, max_length=20)
    preferences: dict[str, Any] = Field(default_factory=dict)
    note: str = Field("", max_length=300)


def _get(db: Session, user: User) -> Profile:
    p = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if not p:
        p = Profile(user_id=user.id, data=initial_profile())
        db.add(p)
        db.commit()
    return p


@router.get("")
def get_profile(user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _get(db, user)
    return {"data": p.data, "version": p.version, "updated_at": p.updated_at.isoformat()}


def rescore_all(user_id: int) -> None:
    db = SessionLocal()
    try:
        data = db.scalar(select(Profile).where(Profile.user_id == user_id)).data
        for o in db.scalars(select(JobOffer).where(JobOffer.user_id == user_id, JobOffer.is_active.is_(True))).all():
            score_offer(o, data, use_llm=False)
        db.commit()
    finally:
        db.close()


@router.put("")
def save_profile(body: ProfileIn, background: BackgroundTasks, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _get(db, user)
    data = ensure_ids(body.model_dump(exclude={"note"}))
    home = (data.get("preferences") or {}).get("home") or {}
    if home.get("label") and (home.get("lat") is None or home.get("label") != ((p.data.get("preferences") or {}).get("home") or {}).get("label")):
        g = geo.geocode(home["label"])
        if g:
            home.update({"lat": g["lat"], "lon": g["lon"]})
        else:
            home.update({"lat": None, "lon": None})
        data["preferences"]["home"] = home
    db.add(ProfileRevision(user_id=user.id, version=p.version, data=p.data, note=body.note or "Modification"))
    p.data = data
    p.version += 1
    db.commit()
    background.add_task(rescore_all, user.id)
    return {"data": p.data, "version": p.version, "rescoring": True}


@router.get("/revisions")
def revisions(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(ProfileRevision).where(ProfileRevision.user_id == user.id).order_by(ProfileRevision.id.desc()).limit(50)).all()
    return [{"id": r.id, "version": r.version, "note": r.note, "created_at": r.created_at.isoformat()} for r in rows]


@router.post("/revisions/{rev_id}/restore")
def restore(rev_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = db.get(ProfileRevision, rev_id)
    if not r or r.user_id != user.id:
        raise HTTPException(404)
    p = _get(db, user)
    db.add(ProfileRevision(user_id=user.id, version=p.version, data=p.data, note=f"Avant restauration v{r.version}"))
    p.data, p.version = r.data, p.version + 1
    db.commit()
    return {"data": p.data, "version": p.version}


@router.post("/import-cv")
async def import_cv(file: UploadFile = File(...), user: User = Depends(current_user)):
    data = await file.read()
    try:
        return parse_cv(file.filename or "cv", data)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
