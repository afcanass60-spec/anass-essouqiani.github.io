from __future__ import annotations

from typing import Any

from ..models import Application, CVVersion, JobOffer, Letter, SearchRun
from ..services.normalize import CONTRACT_LABELS, monthly_net_estimate
from ..services.scoring import category


def offer_out(o: JobOffer, detail: bool = False) -> dict[str, Any]:
    d = {
        "id": o.id, "title": o.title, "company": o.company, "company_type": o.company_type, "sector": o.sector,
        "location": o.location_label, "city": o.city, "work_mode": o.work_mode,
        "contracts": o.contract_types, "contract_labels": [CONTRACT_LABELS.get(c, c) for c in o.contract_types or []],
        "salary": {"min_annual": o.salary_min_annual, "max_annual": o.salary_max_annual, "label": o.salary_label,
                   "monthly_gross": round(o.salary_max_annual / 12) if o.salary_max_annual else None,
                   "monthly_net_estimate": monthly_net_estimate(o.salary_max_annual), "estimated": o.salary_is_estimated},
        "published_at": o.published_at.isoformat() if o.published_at else None,
        "first_seen_at": o.first_seen_at.isoformat() if o.first_seen_at else None,
        "sources": sorted({s.source for s in o.sources}),
        "score": o.score, "score_category": category(o.score) if o.score is not None else None, "score_method": o.score_method,
        "skills": list(dict.fromkeys((o.skills_required or []) + (o.skills_desired or [])))[:12],
        "url": o.url, "status": o.status, "is_active": o.is_active, "closed_reason": o.closed_reason,
        "is_urgent": o.is_urgent, "republished_count": o.republished_count, "needs_details": o.needs_details,
        "travel_minutes": o.travel_minutes, "travel_mode": o.travel_mode, "distance_km": o.distance_km,
        "education_level": o.education_level, "experience_years": o.experience_years, "beginner_ok": o.beginner_ok,
        "explanation": (o.score_details or {}).get("explanation"),
    }
    if detail:
        d.update({
            "description": o.description, "score_details": o.score_details, "skills_required": o.skills_required,
            "skills_desired": o.skills_desired, "license_required": o.license_required, "english_required": o.english_required,
            "start_date": o.start_date.isoformat() if o.start_date else None, "travel_source": o.travel_source,
            "injection_flag": o.injection_flag, "postal_code": o.postal_code,
            "source_links": [{"source": s.source, "url": s.url, "first_seen_at": s.first_seen_at.isoformat(), "last_seen_at": s.last_seen_at.isoformat()} for s in o.sources],
        })
    return d


def run_out(r: SearchRun) -> dict[str, Any]:
    return {"id": r.id, "search_id": r.search_id, "trigger": r.trigger, "status": r.status, "started_at": r.started_at.isoformat(),
            "finished_at": r.finished_at.isoformat() if r.finished_at else None, "stats": r.stats, "errors": r.errors, "report": r.report}


def application_out(a: Application, detail: bool = False) -> dict[str, Any]:
    d = {"id": a.id, "offer_id": a.offer_id, "company": a.company, "title": a.title, "url": a.url, "status": a.status,
         "applied_at": a.applied_at.isoformat() if a.applied_at else None, "next_action_at": a.next_action_at.isoformat() if a.next_action_at else None,
         "updated_at": a.updated_at.isoformat(), "created_at": a.created_at.isoformat(), "validated": a.validated,
         "contacts_count": len(a.contacts or []), "documents_count": len(a.documents)}
    if detail:
        d.update({"contacts": a.contacts, "notes": a.notes,
                  "events": [{"id": e.id, "kind": e.kind, "payload": e.payload, "created_at": e.created_at.isoformat()} for e in a.events],
                  "documents": [{"id": doc.id, "kind": doc.kind, "title": doc.title, "created_at": doc.created_at.isoformat(),
                                 "has_pdf": bool(doc.file_pdf), "has_docx": bool(doc.file_docx), "content": doc.content} for doc in a.documents]})
    return d


def cv_out(v: CVVersion, full: bool = True) -> dict[str, Any]:
    d = {"id": v.id, "name": v.name, "template": v.template, "theme": v.theme, "origin": v.origin, "revision": v.revision,
         "target_offer_id": v.target_offer_id, "updated_at": v.updated_at.isoformat()}
    if full:
        d["content"] = v.content
    return d


def letter_out(x: Letter) -> dict[str, Any]:
    return {"id": x.id, "offer_id": x.offer_id, "kind": x.kind, "style": x.style, "title": x.title, "body": x.body,
            "generated_by": x.generated_by, "analysis": x.analysis, "updated_at": x.updated_at.isoformat()}
