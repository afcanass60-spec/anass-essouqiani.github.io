"""Ingestion : RawJob -> JobOffer canonique (normalisation, dédoublonnage, géolocalisation, trajet, score)."""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import JobOffer, OfferSource
from . import geo
from .dedup import find_duplicate, is_republication, norm_company, norm_title
from .normalize import (
    RawJob,
    annualize,
    classify_company,
    parse_contracts,
    parse_education,
    parse_english,
    parse_experience,
    parse_license,
    parse_salary,
    parse_start_date,
    parse_work_mode,
)
from .scoring import score_offer
from .skills import extract_skills, normalize, split_required_desired
from .urlsafe import clean_url

log = logging.getLogger(__name__)


def _utc(d: datetime | None) -> datetime | None:
    if d is None:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def apply_fields(offer: JobOffer, raw: RawJob) -> None:
    text = f"{raw.title}\n{raw.description}"
    offer.title = raw.title[:300]
    offer.title_norm = norm_title(raw.title)[:300]
    offer.company = (raw.company or "")[:200]
    offer.company_norm = norm_company(raw.company or "")[:200]
    offer.description = raw.description or ""
    offer.location_label = raw.location_label[:200]
    offer.city = raw.city
    offer.postal_code = raw.postal_code
    offer.latitude, offer.longitude = raw.latitude, raw.longitude
    offer.url = clean_url(raw.url)
    offer.contract_types = parse_contracts(raw.contract_hint, raw.title, raw.description[:1500] if not raw.contract_hint else "")
    smin, smax, period = (raw.salary_min, raw.salary_max, raw.salary_period)
    if smin is None and smax is None:
        smin, smax, period = parse_salary(raw.salary_text)
    offer.salary_min_annual = annualize(smin, period)
    offer.salary_max_annual = annualize(smax if smax is not None else smin, period)
    offer.salary_label = raw.salary_text or (f"{offer.salary_min_annual:.0f}–{offer.salary_max_annual:.0f} € brut/an" if offer.salary_min_annual else None)
    offer.salary_is_estimated = raw.salary_is_estimated
    offer.education_level = parse_education(raw.education_hint) or parse_education(text)
    years, beginner = parse_experience(raw.experience_hint or "")
    y2, b2 = parse_experience(text)
    offer.experience_years = years if years is not None else y2
    offer.beginner_ok = beginner or b2
    offer.work_mode = parse_work_mode(raw.remote_hint, text)
    offer.license_required = raw.license_required if raw.license_required is not None else parse_license(text)
    offer.english_required = raw.english_required if raw.english_required is not None else parse_english(text)
    offer.start_date = parse_start_date(text)
    offer.published_at = _utc(raw.published_at) or offer.published_at
    req, des = split_required_desired(text)
    req = list(dict.fromkeys(raw.skills_required + req))
    des = [s for s in dict.fromkeys(raw.skills_desired + des) if s not in req]
    if not req and not des:
        des = extract_skills(text)
    offer.skills_required, offer.skills_desired = req, des
    ctype, sector = classify_company(raw.company or "", raw.description or "", raw.company_size_hint)
    offer.company_type, offer.sector = ctype, sector
    offer.needs_details = raw.needs_details
    offer.is_urgent = bool(re.search(r"\burgent\b|asap|des que possible|demarrage immediat", normalize(raw.title + " " + raw.description[:800])))
    if raw.is_closed:
        offer.is_active = False
        offer.closed_reason = "Annonce indiquée comme pourvue/expirée par la source"


def locate(offer: JobOffer, profile: dict[str, Any]) -> None:
    if offer.latitude is None and (offer.city or offer.location_label):
        g = geo.geocode(" ".join(x for x in [offer.postal_code or "", offer.city or offer.location_label] if x))
        if g:
            offer.latitude, offer.longitude = g["lat"], g["lon"]
            offer.city = offer.city or g.get("city")
            offer.postal_code = offer.postal_code or g.get("postcode")
    home = (profile.get("preferences") or {}).get("home") or {}
    if home.get("lat") is not None and offer.latitude is not None:
        origin = (home["lat"], home["lon"])
        offer.distance_km = round(geo.haversine_km(origin, (offer.latitude, offer.longitude)), 1)
        if offer.travel_minutes is None and offer.work_mode != "remote":
            mode = (profile.get("preferences") or {}).get("travel_mode", "transit")
            m, md, src = geo.compute_travel(origin, (offer.latitude, offer.longitude), mode)
            offer.travel_minutes, offer.travel_mode, offer.travel_source = m, md, src


def ingest(db: Session, user_id: int, raw: RawJob, profile: dict[str, Any], *, use_llm: bool | None = None) -> tuple[str, JobOffer]:
    """Retourne (statut, offre) avec statut ∈ {new, duplicate, seen, republished}."""
    now = datetime.now(timezone.utc)
    existing_src = db.scalar(select(OfferSource).where(
        OfferSource.user_id == user_id, OfferSource.source == raw.source, OfferSource.external_id == raw.external_id))
    if existing_src:
        existing_src.last_seen_at = now
        offer = existing_src.offer
        offer.last_seen_at = now
        if raw.is_closed and offer.is_active:
            offer.is_active = False
            offer.closed_reason = "Annonce indiquée comme pourvue/expirée par la source"
        return "seen", offer

    dup, _sim = find_duplicate(db, user_id, raw.title, raw.company, raw.city, raw.postal_code, raw.description)
    if dup:
        status = "duplicate"
        if is_republication(dup, _utc(raw.published_at)):
            dup.republished_count += 1
            dup.published_at = _utc(raw.published_at)
            status = "republished"
        # on enrichit l'annonce canonique si la nouvelle source est plus complète
        if len(raw.description or "") > len(dup.description or "") + 200 or dup.needs_details:
            keep = {"status": dup.status, "first_seen": dup.first_seen_at, "rep": dup.republished_count}
            apply_fields(dup, raw)
            dup.status, dup.first_seen_at, dup.republished_count = keep["status"], keep["first_seen"], keep["rep"]
            locate(dup, profile)
            score_offer(dup, profile, use_llm=use_llm)
        dup.last_seen_at = now
        if not dup.is_active and not raw.is_closed:
            dup.is_active, dup.closed_reason = True, None
        db.add(OfferSource(user_id=user_id, offer=dup, source=raw.source, external_id=raw.external_id,
                           url=clean_url(raw.url), raw=_slim(raw.raw)))
        return status, dup

    offer = JobOffer(user_id=user_id, first_seen_at=now, last_seen_at=now)
    apply_fields(offer, raw)
    locate(offer, profile)
    score_offer(offer, profile, use_llm=use_llm)
    db.add(offer)
    db.add(OfferSource(user_id=user_id, offer=offer, source=raw.source, external_id=raw.external_id,
                       url=clean_url(raw.url), raw=_slim(raw.raw)))
    db.flush()
    return "new", offer


def _slim(raw: dict[str, Any]) -> dict[str, Any]:
    """Évite de stocker des blobs énormes."""
    import json

    s = json.dumps(raw, ensure_ascii=False, default=str)
    return raw if len(s) < 50_000 else {"truncated": True}
