"""Moteur de filtrage avancé des offres."""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from pydantic import BaseModel, Field
from sqlalchemy import Select, and_, false, func, or_, select

from ..models import JobOffer, OfferSource
from .geo import geocode, haversine_km
from .normalize import NET_RATIO, PRESET_LOCATIONS


class OfferFilters(BaseModel):
    q: str | None = None
    contracts: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    radius_km: int = 30
    national: bool = False
    work_modes: list[Literal["remote", "hybrid", "onsite"]] = Field(default_factory=list)
    travel_max: int | None = None  # minutes — temps de trajet RÉEL calculé
    include_unknown_travel: bool = True
    salary_min: float | None = None
    salary_max: float | None = None
    salary_unit: Literal["annual_gross", "monthly_gross", "monthly_net"] = "annual_gross"
    include_no_salary: bool = True
    only_no_salary: bool = False
    published_within: Literal["today", "1", "3", "7", "14", "30"] | None = None
    education_levels: list[int] = Field(default_factory=list)
    beginner_ok: bool = False
    max_experience_years: float | None = None
    company_types: list[Literal["grand_groupe", "pme", "esn", "public", "startup"]] = Field(default_factory=list)
    sector: Literal["public", "prive"] | None = None
    start_after: date | None = None
    start_before: date | None = None
    license: Literal["required", "not_required"] | None = None
    english: Literal["required", "not_required"] | None = None
    min_score: int | None = None
    statuses: list[str] = Field(default_factory=lambda: ["new", "saved"])
    sources: list[str] = Field(default_factory=list)
    active_only: bool = True
    urgent_only: bool = False
    sort: Literal["score", "newest", "salary", "travel"] = "score"
    page: int = 1
    page_size: int = Field(default=30, le=100)


def _to_annual(v: float, unit: str) -> float:
    if unit == "monthly_gross":
        return v * 12
    if unit == "monthly_net":
        return v * 12 / NET_RATIO
    return v


def _points(f: OfferFilters) -> list[tuple[float, float]]:
    pts = []
    for loc in f.locations:
        if loc in PRESET_LOCATIONS:
            pts.append(PRESET_LOCATIONS[loc])
        else:
            g = geocode(loc)
            if g:
                pts.append((g["lat"], g["lon"]))
    return pts


def build_query(user_id: int, f: OfferFilters) -> tuple[Select, list[tuple[float, float]] | None]:
    stmt = select(JobOffer).where(JobOffer.user_id == user_id)
    if f.active_only:
        stmt = stmt.where(JobOffer.is_active.is_(True))
    if f.statuses:
        stmt = stmt.where(JobOffer.status.in_(f.statuses))
    if f.q:
        like = f"%{f.q.lower()}%"
        stmt = stmt.where(or_(func.lower(JobOffer.title).like(like), func.lower(JobOffer.company).like(like),
                              func.lower(JobOffer.description).like(like)))
    if f.contracts:
        # JSON portable (SQLite/PostgreSQL) : filtre sur la représentation texte
        from sqlalchemy import String, cast

        stmt = stmt.where(or_(*[cast(JobOffer.contract_types, String).like(f'%"{c}"%') for c in f.contracts]))
    if f.work_modes:
        conds = [JobOffer.work_mode.in_(f.work_modes)]
        if "onsite" in f.work_modes:
            conds.append(JobOffer.work_mode.is_(None))
        stmt = stmt.where(or_(*conds))
    if f.travel_max:
        cond = JobOffer.travel_minutes <= f.travel_max
        stmt = stmt.where(or_(cond, JobOffer.work_mode == "remote", JobOffer.travel_minutes.is_(None)) if f.include_unknown_travel
                          else or_(cond, JobOffer.work_mode == "remote"))
    if f.only_no_salary:
        stmt = stmt.where(JobOffer.salary_min_annual.is_(None))
    else:
        sal = []
        if f.salary_min is not None:
            sal.append(func.coalesce(JobOffer.salary_max_annual, JobOffer.salary_min_annual) >= _to_annual(f.salary_min, f.salary_unit))
        if f.salary_max is not None:
            sal.append(JobOffer.salary_min_annual <= _to_annual(f.salary_max, f.salary_unit))
        if sal:
            stmt = stmt.where(or_(and_(*sal), JobOffer.salary_min_annual.is_(None)) if f.include_no_salary else and_(*sal))
        elif not f.include_no_salary:
            stmt = stmt.where(JobOffer.salary_min_annual.is_not(None))
    if f.published_within:
        now = datetime.now(timezone.utc)
        since = now.replace(hour=0, minute=0, second=0, microsecond=0) if f.published_within == "today" else now - timedelta(days=int(f.published_within))
        stmt = stmt.where(func.coalesce(JobOffer.published_at, JobOffer.first_seen_at) >= since)
    if f.education_levels:
        stmt = stmt.where(or_(JobOffer.education_level.in_(f.education_levels), JobOffer.education_level.is_(None)))
    if f.beginner_ok:
        stmt = stmt.where(or_(JobOffer.beginner_ok.is_(True), JobOffer.experience_years <= 1))
    if f.max_experience_years is not None:
        stmt = stmt.where(or_(JobOffer.experience_years <= f.max_experience_years, JobOffer.experience_years.is_(None)))
    if f.company_types:
        stmt = stmt.where(JobOffer.company_type.in_(f.company_types))
    if f.sector:
        stmt = stmt.where(JobOffer.sector == f.sector)
    if f.start_after:
        stmt = stmt.where(or_(JobOffer.start_date >= f.start_after, JobOffer.start_date.is_(None)))
    if f.start_before:
        stmt = stmt.where(or_(JobOffer.start_date <= f.start_before, JobOffer.start_date.is_(None)))
    if f.license == "required":
        stmt = stmt.where(JobOffer.license_required.is_(True))
    elif f.license == "not_required":
        stmt = stmt.where(or_(JobOffer.license_required.is_(None), JobOffer.license_required.is_(False)))
    if f.english == "required":
        stmt = stmt.where(JobOffer.english_required.is_(True))
    elif f.english == "not_required":
        stmt = stmt.where(or_(JobOffer.english_required.is_(None), JobOffer.english_required.is_(False)))
    if f.min_score is not None:
        stmt = stmt.where(JobOffer.score >= f.min_score)
    if f.urgent_only:
        stmt = stmt.where(JobOffer.is_urgent.is_(True))
    if f.sources:
        stmt = stmt.where(JobOffer.id.in_(select(OfferSource.offer_id).where(OfferSource.source.in_(f.sources))))
    pts = None
    if f.locations and not f.national:
        pts = _points(f)
        if pts:
            # pré-filtre SQL par boîte englobante, puis filtre exact (haversine) côté Python
            boxes = []
            for lat, lon in pts:
                dlat = f.radius_km / 111.0
                dlon = f.radius_km / (111.0 * max(0.2, math.cos(math.radians(lat))))
                boxes.append(and_(JobOffer.latitude.between(lat - dlat, lat + dlat), JobOffer.longitude.between(lon - dlon, lon + dlon)))
            stmt = stmt.where(or_(*boxes, JobOffer.work_mode == "remote"))
        else:
            stmt = stmt.where(false())
    order = {
        "score": [JobOffer.score.desc().nulls_last(), JobOffer.first_seen_at.desc()],
        "newest": [func.coalesce(JobOffer.published_at, JobOffer.first_seen_at).desc()],
        "salary": [JobOffer.salary_max_annual.desc().nulls_last()],
        "travel": [JobOffer.travel_minutes.asc().nulls_last()],
    }[f.sort]
    return stmt.order_by(*order), pts


def within_radius(offer: JobOffer, pts: list[tuple[float, float]] | None, radius: int) -> bool:
    if not pts or offer.work_mode == "remote":
        return True
    if offer.latitude is None:
        return False
    return any(haversine_km((offer.latitude, offer.longitude), p) <= radius for p in pts)
