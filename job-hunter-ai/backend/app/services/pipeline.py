"""Orchestration d'une recherche : collecte multi-sources -> ingestion -> rapport -> notifications."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..connectors.ats import PROVIDERS, fetch_career_page
from ..connectors.base import ConnectorError, NotConfigured, SearchQuery
from ..connectors.registry import CONNECTORS
from ..models import Company, JobOffer, KeyValue, Profile, SavedSearch, SearchRun
from .ingest import ingest
from .notify import notify
from .profile_data import initial_profile
from .skills import SEARCH_KEYWORDS_BY_DOMAIN

log = logging.getLogger(__name__)
FREQUENCIES = {"6h": timedelta(hours=6), "daily": timedelta(days=1), "weekly": timedelta(weeks=1)}
HIGH = 80
TOP = 90


def get_profile(db: Session, user_id: int) -> dict[str, Any]:
    p = db.scalar(select(Profile).where(Profile.user_id == user_id))
    return p.data if p else initial_profile()


def default_keywords(profile: dict[str, Any]) -> list[str]:
    kws: list[str] = []
    for d in (profile.get("preferences") or {}).get("domains", []):
        kws += SEARCH_KEYWORDS_BY_DOMAIN.get(d, [])[:2]
    return list(dict.fromkeys(kws))


def build_query(search: SavedSearch, profile: dict[str, Any]) -> SearchQuery:
    p = search.params or {}
    prefs = profile.get("preferences") or {}
    return SearchQuery(
        keywords=search.keywords or default_keywords(profile),
        contracts=p.get("contracts") or prefs.get("contracts") or [],
        locations=p.get("locations") or prefs.get("locations") or [],
        radius_km=int(p.get("radius_km") or prefs.get("radius_km") or 30),
        national=bool(p.get("national")),
        published_days=p.get("published_days") or 14,
        max_results_per_keyword=int(p.get("max_results_per_keyword") or 50),
    )


def ingest_batch(db: Session, user_id: int, raws, profile, stats: dict, new_ids: list[int]) -> None:
    for raw in raws:
        try:
            status, offer = ingest(db, user_id, raw, profile)
            stats[status] = stats.get(status, 0) + 1
            if status == "new":
                db.flush()
                new_ids.append(offer.id)
        except Exception as e:  # une annonce invalide ne doit pas bloquer le lot
            log.exception("Ingestion en échec : %s", e)
            stats["invalid"] = stats.get("invalid", 0) + 1
    db.commit()


def run_search(db: Session, user_id: int, search: SavedSearch, trigger: str = "manual", run: SearchRun | None = None) -> SearchRun:
    if run is None:
        run = SearchRun(user_id=user_id, search_id=search.id, trigger=trigger)
        db.add(run)
        db.commit()
    profile = get_profile(db, user_id)
    q = build_query(search, profile)
    stats: dict[str, Any] = {"fetched": 0, "new": 0, "duplicate": 0, "republished": 0, "seen": 0, "by_source": {}}
    errors: list[dict] = []
    new_ids: list[int] = []
    sources = search.sources or [k for k, c in CONNECTORS.items() if c.configured()]
    if not sources:
        errors.append({"source": "configuration", "type": "not_configured",
                       "error": "Aucune source configurée : renseignez au moins une clé API (voir Paramètres)."})
    for key in sources:
        conn = CONNECTORS.get(key)
        if not conn:
            continue
        try:
            raws = conn.search(q)
        except NotConfigured as e:
            errors.append({"source": key, "error": str(e), "type": "not_configured"})
            continue
        except (ConnectorError, Exception) as e:  # noqa: BLE001
            log.warning("Source %s en échec : %s", key, e)
            errors.append({"source": key, "error": str(e)[:300], "type": "error"})
            continue
        stats["fetched"] += len(raws)
        stats["by_source"][key] = len(raws)
        ingest_batch(db, user_id, raws, profile, stats, new_ids)
    finalize_run(db, run, stats, errors, new_ids)
    search.last_run_at = datetime.now(timezone.utc)
    if search.frequency in FREQUENCIES:
        search.next_run_at = search.last_run_at + FREQUENCIES[search.frequency]
    db.commit()
    return run


def finalize_run(db: Session, run: SearchRun, stats: dict, errors: list[dict], new_ids: list[int]) -> None:
    new_offers = db.scalars(select(JobOffer).where(JobOffer.id.in_(new_ids))).all() if new_ids else []
    high = [o for o in new_offers if (o.score or 0) >= HIGH]
    top = [o for o in new_offers if (o.score or 0) >= TOP]
    urgent = [o for o in new_offers if o.is_urgent and (o.score or 0) >= 60]
    stats.update({"new": len(new_offers), "high": len(high), "top": len(top), "urgent": len(urgent)})
    lines = [f"{len(new_offers)} nouvelle(s) offre(s) détectée(s), dont {len(top)} avec un score supérieur à 90 % "
             f"et {len(high)} au-dessus de 80 %."]
    if stats.get("duplicate") or stats.get("republished"):
        lines.append(f"{stats.get('duplicate', 0)} doublon(s) regroupé(s), {stats.get('republished', 0)} republication(s).")
    for o in sorted(high, key=lambda x: -(x.score or 0))[:8]:
        lines.append(f"• {o.score}/100 — {o.title} · {o.company or 'Entreprise non précisée'} ({o.location_label})")
    if urgent:
        lines.append(f"{len(urgent)} annonce(s) marquée(s) urgente(s).")
    for e in errors:
        lines.append(f"⚠ {e['source']} : {e['error']}")
    run.stats, run.errors, run.report = stats, errors, "\n".join(lines)
    run.status = "failed" if stats["fetched"] == 0 and any(e.get("type") == "error" for e in errors) else "done"
    run.finished_at = datetime.now(timezone.utc)
    db.commit()
    if new_offers or any(e.get("type") == "error" for e in errors):
        notify(db, run.user_id, "report", lines[0], "\n".join(lines[1:]), link="/offers?sort=score", external=bool(high))
    for o in top:
        notify(db, run.user_id, "match", f"Excellent match : {o.title} ({o.score}/100)", o.company or "", link=f"/offers/{o.id}")


def watch_company(db: Session, company: Company, trigger: str = "manual") -> dict:
    """Interroge la page carrière d'une entreprise suivie."""
    profile = get_profile(db, company.user_id)
    stats: dict[str, Any] = {"fetched": 0}
    new_ids: list[int] = []
    result: dict[str, Any] = {"company": company.name}
    try:
        if company.ats_provider in PROVIDERS and company.ats_slug:
            raws = PROVIDERS[company.ats_provider](company.ats_slug, company.name)
            stats["fetched"] = len(raws)
            ingest_batch(db, company.user_id, raws, profile, stats, new_ids)
            # offres disparues de l'ATS = probablement pourvues/clôturées
            current = {r.external_id for r in raws}
            from ..models import OfferSource

            for src in db.scalars(select(OfferSource).where(OfferSource.user_id == company.user_id, OfferSource.source == company.ats_provider,
                                                            OfferSource.external_id.like(f"{company.ats_slug}:%"))).all():
                if src.external_id not in current and src.offer.is_active and len(src.offer.sources) == 1:
                    src.offer.is_active = False
                    src.offer.closed_reason = "Retirée de la page carrière (probablement pourvue)"
            company.last_check_status = f"{len(raws)} offre(s) sur la page carrière, {len(new_ids)} nouvelle(s)"
        elif company.careers_url:
            raws, digest = fetch_career_page(company.careers_url, company.name)
            changed = company.page_hash is not None and digest != company.page_hash
            company.page_hash = digest
            stats["fetched"] = len(raws)
            ingest_batch(db, company.user_id, raws, profile, stats, new_ids)
            company.last_check_status = (f"{len(raws)} offre(s) structurée(s) détectée(s)" if raws else
                                         "Aucune offre structurée (JSON-LD) : suivi par détection de changement")
            if changed and not raws:
                notify(db, company.user_id, "company", f"La page carrière de {company.name} a changé",
                       "Nouvelles offres possibles : vérifiez la page.", link=company.careers_url)
        else:
            company.last_check_status = "Aucune page carrière renseignée"
    except Exception as e:  # noqa: BLE001
        company.last_check_status = f"Erreur : {str(e)[:250]}"
        result["error"] = str(e)
    company.last_checked_at = datetime.now(timezone.utc)
    db.commit()
    new = db.scalars(select(JobOffer).where(JobOffer.id.in_(new_ids))).all() if new_ids else []
    rel = [o for o in new if (o.score or 0) >= 70]
    if rel:
        notify(db, company.user_id, "company", f"{len(rel)} offre(s) pertinente(s) chez {company.name}",
               "\n".join(f"• {o.score}/100 — {o.title}" for o in rel[:6]), link="/offers?sort=newest", external=True)
    result.update({"new": len(new), "relevant": len(rel), "status": company.last_check_status})
    return result


def heartbeat(db: Session, name: str = "scheduler") -> None:
    kv = db.get(KeyValue, name) or KeyValue(key=name)
    kv.value = {"at": datetime.now(timezone.utc).isoformat()}
    kv.updated_at = datetime.now(timezone.utc)
    db.merge(kv)
    db.commit()


def scheduler_status(db: Session) -> dict:
    kv = db.get(KeyValue, "scheduler")
    if not kv:
        return {"active": False, "last_beat": None, "message": "Planificateur jamais démarré : la recherche automatique n'est PAS active."}
    last = datetime.fromisoformat(kv.value["at"])
    age = (datetime.now(timezone.utc) - last).total_seconds()
    active = age < 15 * 60
    return {"active": active, "last_beat": kv.value["at"],
            "message": "Planificateur actif" if active else f"Planificateur inactif depuis {int(age // 60)} min : recherches automatiques suspendues."}
