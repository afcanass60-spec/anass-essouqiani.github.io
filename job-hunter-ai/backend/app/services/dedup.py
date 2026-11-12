"""Détection des doublons inter-plateformes et des republications."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import JobOffer
from .skills import normalize

_COMPANY_NOISE = r"\b(sas|sa|sasu|sarl|eurl|groupe|group|france|inc|ltd|gmbh|holding|services?|the)\b"
_TITLE_NOISE = r"\(?\b(h ?/ ?f|f ?/ ?h|m ?/ ?f|f ?/ ?m|h ?/ ?f ?/ ?x|x ?/ ?f ?/ ?h|homme|femme|en alternance|alternance|alternant\w*|apprenti\w*|cdi|cdd|stage|stagiaire)\b\)?"


def norm_company(name: str) -> str:
    n = re.sub(_COMPANY_NOISE, " ", normalize(name))
    return re.sub(r"[^a-z0-9]+", " ", n).strip()


def norm_title(title: str) -> str:
    n = re.sub(_TITLE_NOISE, " ", normalize(title))
    return re.sub(r"[^a-z0-9+#]+", " ", n).strip()


def same_place(a: JobOffer | dict, b: JobOffer) -> bool:
    ca = normalize((a.get("city") if isinstance(a, dict) else a.city) or "")
    cb = normalize(b.city or "")
    pa = (a.get("postal_code") if isinstance(a, dict) else a.postal_code) or ""
    if not ca or not cb:
        return True  # inconnu : on ne bloque pas
    if pa and b.postal_code and pa[:2] != b.postal_code[:2]:
        return False
    return fuzz.ratio(ca, cb) >= 80 or ca in cb or cb in ca


def find_duplicate(db: Session, user_id: int, title: str, company: str, city: str | None, postal_code: str | None,
                   description: str) -> tuple[JobOffer | None, float]:
    """Cherche une annonce équivalente déjà connue. Retourne (offre, similarité 0-100)."""
    cn = norm_company(company)
    tn = norm_title(title)
    if not tn:
        return None, 0.0
    q = select(JobOffer).where(JobOffer.user_id == user_id)
    if cn:
        candidates = db.scalars(q.where(JobOffer.company_norm == cn)).all()
        if not candidates:
            # variante d'écriture de l'entreprise
            prefix = cn.split(" ")[0]
            pool = db.scalars(q.where(JobOffer.company_norm.like(f"{prefix}%"))).all()
            candidates = [o for o in pool if fuzz.token_set_ratio(cn, o.company_norm) >= 90]
    else:
        candidates = db.scalars(q.where(JobOffer.title_norm == tn)).all()
    best, best_score = None, 0.0
    desc_n = normalize(description)[:3000]
    for o in candidates:
        t_sim = fuzz.token_set_ratio(tn, o.title_norm)
        if t_sim < 85:
            continue
        if not same_place({"city": city, "postal_code": postal_code}, o):
            continue
        d_sim = 100.0
        o_desc = normalize(o.description)[:3000]
        if len(desc_n) > 200 and len(o_desc) > 200:
            d_sim = fuzz.token_set_ratio(desc_n, o_desc)
            if d_sim < 60:
                continue  # même intitulé mais poste différent (ex : plusieurs sites)
        sim = 0.6 * t_sim + 0.4 * d_sim
        if sim > best_score:
            best, best_score = o, sim
    return best, best_score


def is_republication(existing: JobOffer, new_published: datetime | None) -> bool:
    """Republication : même annonce revue avec une nouvelle date de publication ≥ 14 jours après la première."""
    if not new_published or not existing.published_at:
        return False
    a = existing.published_at if existing.published_at.tzinfo else existing.published_at.replace(tzinfo=timezone.utc)
    b = new_published if new_published.tzinfo else new_published.replace(tzinfo=timezone.utc)
    return b - a >= timedelta(days=14)
