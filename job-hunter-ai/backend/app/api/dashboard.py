from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..connectors.registry import sources_status
from ..db import get_db
from ..deps import current_user
from ..models import Application, JobOffer, Notification, OfferSource, SearchRun, User, UserSecret
from ..security import encrypt_secret
from ..services.geo import travel_configured
from ..services.pipeline import scheduler_status
from ..services.urlsafe import UnsafeURLError, validate_external_url
from .serializers import offer_out, run_out

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    base = select(func.count(JobOffer.id)).where(JobOffer.user_id == user.id, JobOffer.is_active.is_(True))
    ctype = cast(JobOffer.contract_types, String)
    alt = base.where(ctype.like('%"alternance"%') | ctype.like('%"apprentissage"%') | ctype.like('%"professionnalisation"%'))
    apps = db.scalars(select(Application).where(Application.user_id == user.id)).all()
    status_counts = Counter(a.status for a in apps)
    sent = sum(v for k, v in status_counts.items() if k not in ("a_analyser", "a_postuler"))
    interviews = sum(1 for a in apps if any(e.kind == "status" and (e.payload or {}).get("to") in ("entretien_rh", "entretien_technique") for e in a.events))
    kpis = {
        "total": db.scalar(base),
        "new_today": db.scalar(base.where(JobOffer.first_seen_at >= today)),
        "above_80": db.scalar(base.where(JobOffer.score >= 80)),
        "alternance": db.scalar(alt),
        "cdi": db.scalar(base.where(ctype.like('%"cdi"%'))),
        "companies": db.scalar(select(func.count(func.distinct(JobOffer.company_norm))).where(JobOffer.user_id == user.id, JobOffer.is_active.is_(True), JobOffer.company_norm != "")),
        "applications_sent": sent,
        "interviews": interviews,
        "saved": db.scalar(base.where(JobOffer.status == "saved")),
    }
    since = now - timedelta(days=13)
    per_day = Counter()
    for (d,) in db.execute(select(JobOffer.first_seen_at).where(JobOffer.user_id == user.id, JobOffer.first_seen_at >= since)).all():
        per_day[d.date().isoformat() if d else ""] += 1
    days = [(since + timedelta(days=i)).date().isoformat() for i in range(14)]
    scores = [s for (s,) in db.execute(select(JobOffer.score).where(JobOffer.user_id == user.id, JobOffer.is_active.is_(True))).all() if s is not None]
    buckets = [{"label": lab, "count": sum(1 for s in scores if lo <= s <= hi)} for lab, lo, hi in
               [("<60", 0, 59), ("60–69", 60, 69), ("70–79", 70, 79), ("80–89", 80, 89), ("90+", 90, 100)]]
    by_source = db.execute(select(OfferSource.source, func.count(func.distinct(OfferSource.offer_id))).where(OfferSource.user_id == user.id)
                           .group_by(OfferSource.source)).all()
    top = db.scalars(select(JobOffer).where(JobOffer.user_id == user.id, JobOffer.is_active.is_(True), JobOffer.status.in_(["new", "saved"]))
                     .order_by(JobOffer.score.desc().nulls_last(), JobOffer.first_seen_at.desc()).limit(6)).all()
    last_run = db.scalar(select(SearchRun).where(SearchRun.user_id == user.id, SearchRun.status != "running").order_by(SearchRun.id.desc()))
    followups = [a for a in apps if a.next_action_at and a.next_action_at.replace(tzinfo=timezone.utc) <= now + timedelta(days=1)
                 and a.status in ("envoyee", "relance", "en_attente")]
    return {
        "kpis": kpis,
        "offers_per_day": [{"day": d, "count": per_day.get(d, 0)} for d in days],
        "score_distribution": buckets,
        "by_source": [{"source": s, "count": c} for s, c in by_source],
        "pipeline": [{"status": k, "count": v} for k, v in status_counts.items()],
        "top_offers": [offer_out(o) for o in top],
        "last_run": run_out(last_run) if last_run else None,
        "scheduler": scheduler_status(db),
        "followups": [{"id": a.id, "company": a.company, "title": a.title, "next_action_at": a.next_action_at.isoformat()} for a in followups],
    }


@router.get("/notifications")
def notifications(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.id.desc()).limit(100)).all()
    unread = db.scalar(select(func.count(Notification.id)).where(Notification.user_id == user.id, Notification.read.is_(False)))
    return {"unread": unread, "items": [{"id": n.id, "kind": n.kind, "title": n.title, "body": n.body, "link": n.link, "read": n.read,
                                         "created_at": n.created_at.isoformat()} for n in rows]}


@router.post("/notifications/read-all")
def read_all(user: User = Depends(current_user), db: Session = Depends(get_db)):
    for n in db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.read.is_(False))).all():
        n.read = True
    db.commit()
    return {"ok": True}


@router.get("/settings/status")
def settings_status(user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = get_settings()
    hook = db.query(UserSecret).filter_by(user_id=user.id, name="webhook_url").first()
    return {
        "ai": {"configured": s.llm_enabled, "model": s.llm_model, "scoring_enabled": s.llm_scoring_enabled},
        "sources": sources_status(),
        "travel": travel_configured(),
        "scheduler": scheduler_status(db),
        "notifications": {"smtp": bool(s.smtp_host), "email_to": bool(s.notify_email_to), "webhook": bool(hook or s.notify_webhook_url)},
        "imap": bool(s.imap_host and s.imap_user),
        "environment": s.environment,
    }


class WebhookIn(BaseModel):
    url: str = Field("", max_length=500)


@router.put("/settings/webhook")
def set_webhook(body: WebhookIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = db.query(UserSecret).filter_by(user_id=user.id, name="webhook_url").first()
    if not body.url:
        if row:
            db.delete(row)
            db.commit()
        return {"webhook": False}
    try:
        validate_external_url(body.url)
    except UnsafeURLError as e:
        raise HTTPException(422, str(e)) from e
    if row:
        row.ciphertext = encrypt_secret(body.url)
    else:
        db.add(UserSecret(user_id=user.id, name="webhook_url", ciphertext=encrypt_secret(body.url)))
    db.commit()
    return {"webhook": True}
