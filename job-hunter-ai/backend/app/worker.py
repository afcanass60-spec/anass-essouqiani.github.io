"""Workers Celery + planificateur (beat).

Le beat déclenche `tick` toutes les 5 minutes ; `tick` écrit un battement de cœur (visible dans
l'interface) puis lance les recherches et suivis d'entreprises arrivés à échéance.
Sans `worker` + `beat` en fonctionnement, AUCUNE recherche automatique n'a lieu (l'UI l'indique).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from celery import Celery
from sqlalchemy import select

from .config import get_settings
from .db import SessionLocal, init_db
from .models import Application, Company, JobOffer, Notification, SavedSearch, SearchRun

log = logging.getLogger(__name__)
settings = get_settings()
celery_app = Celery("jobhunter", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    timezone="Europe/Paris", task_acks_late=True, worker_prefetch_multiplier=1, task_time_limit=60 * 30,
    beat_schedule={
        "tick": {"task": "app.worker.tick", "schedule": 300.0},
        "daily-maintenance": {"task": "app.worker.daily_maintenance", "schedule": 6 * 3600.0},
    },
)


@celery_app.on_after_configure.connect
def _setup(**_):
    init_db()


@celery_app.task(name="app.worker.tick")
def tick() -> dict:
    from .services.pipeline import heartbeat

    db = SessionLocal()
    try:
        heartbeat(db)
        now = datetime.now(timezone.utc)
        due = db.scalars(select(SavedSearch).where(SavedSearch.enabled.is_(True), SavedSearch.frequency != "manual",
                                                   SavedSearch.next_run_at <= now)).all()
        for s in due:
            if db.scalar(select(SearchRun).where(SearchRun.search_id == s.id, SearchRun.status == "running")):
                continue
            s.next_run_at = now + timedelta(minutes=30)  # verrou anti-doublon le temps que la tâche démarre
            db.commit()
            run_saved_search.delay(s.id)
        return {"due": len(due)}
    finally:
        db.close()


@celery_app.task(name="app.worker.run_saved_search", bind=True, max_retries=2, default_retry_delay=600)
def run_saved_search(self, search_id: int) -> dict:
    from .services.pipeline import run_search

    db = SessionLocal()
    try:
        s = db.get(SavedSearch, search_id)
        if not s:
            return {"skipped": True}
        run = run_search(db, s.user_id, s, "schedule")
        return {"run_id": run.id, "stats": run.stats}
    except Exception as e:  # noqa: BLE001
        log.exception("Recherche planifiée en échec")
        raise self.retry(exc=e) from e
    finally:
        db.close()


@celery_app.task(name="app.worker.daily_maintenance")
def daily_maintenance() -> dict:
    """Suivi des pages carrières, offres expirées, rappels de relance."""
    from .services.notify import notify
    from .services.pipeline import watch_company

    db = SessionLocal()
    out = {"companies": 0, "expired": 0, "followups": 0}
    try:
        now = datetime.now(timezone.utc)
        for c in db.scalars(select(Company).where(Company.watch.is_(True))).all():
            last = c.last_checked_at.replace(tzinfo=timezone.utc) if c.last_checked_at and not c.last_checked_at.tzinfo else c.last_checked_at
            if not last or now - last > timedelta(hours=20):
                watch_company(db, c, "schedule")
                out["companies"] += 1
        # annonces non revues depuis 45 jours dans aucune source : probablement expirées
        stale = db.scalars(select(JobOffer).where(JobOffer.is_active.is_(True), JobOffer.last_seen_at < now - timedelta(days=45))).all()
        for o in stale:
            o.is_active, o.closed_reason = False, "Non revue depuis 45 jours (probablement expirée)"
        out["expired"] = len(stale)
        db.commit()
        for a in db.scalars(select(Application).where(Application.status.in_(["envoyee", "en_attente"]), Application.next_action_at <= now)).all():
            exists = db.scalar(select(Notification).where(Notification.user_id == a.user_id, Notification.kind == "followup",
                                                          Notification.link == f"/applications/{a.id}", Notification.created_at >= now - timedelta(days=3)))
            if not exists:
                notify(db, a.user_id, "followup", f"Relance à prévoir : {a.company}", a.title, link=f"/applications/{a.id}", external=True)
                if a.status == "envoyee":
                    a.status = "relance"
                out["followups"] += 1
        db.commit()
        return out
    finally:
        db.close()
