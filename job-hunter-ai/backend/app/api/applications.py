from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import client_ip, current_user
from ..models import Application, ApplicationDocument, ApplicationEvent, CVVersion, JobOffer, Letter, User
from ..security import audit
from ..services.letters import KIND_LABELS
from ..services.notify import send_email
from ..services.pipeline import get_profile
from ..services.render import cv_docx, cv_html, html_to_pdf, letter_docx, letter_html
from ..services.urlsafe import clean_url
from .serializers import application_out

router = APIRouter(prefix="/api/applications", tags=["applications"])

STATUSES = ["a_analyser", "a_postuler", "envoyee", "relance", "entretien_rh", "entretien_technique", "en_attente", "refus", "accepte"]
STATUS_LABELS = {"a_analyser": "À analyser", "a_postuler": "À postuler", "envoyee": "Candidature envoyée", "relance": "Relance nécessaire",
                 "entretien_rh": "Entretien RH", "entretien_technique": "Entretien technique", "en_attente": "En attente",
                 "refus": "Refus", "accepte": "Accepté"}
StatusT = Literal["a_analyser", "a_postuler", "envoyee", "relance", "entretien_rh", "entretien_technique", "en_attente", "refus", "accepte"]


def _own(db: Session, user: User, aid: int) -> Application:
    a = db.get(Application, aid)
    if not a or a.user_id != user.id:
        raise HTTPException(404)
    return a


def _event(a: Application, kind: str, **payload: Any) -> None:
    a.events.append(ApplicationEvent(kind=kind, payload=payload))


@router.get("")
def list_apps(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Application).where(Application.user_id == user.id).order_by(Application.updated_at.desc())).all()
    return {"items": [application_out(a) for a in rows], "statuses": [{"key": k, "label": STATUS_LABELS[k]} for k in STATUSES]}


class AppIn(BaseModel):
    company: str = Field(max_length=200)
    title: str = Field(max_length=300)
    url: str | None = Field(None, max_length=1000)
    status: StatusT = "a_analyser"
    notes: str = Field("", max_length=20000)


@router.post("")
def create(body: AppIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = Application(user_id=user.id, company=body.company, title=body.title, url=clean_url(body.url), status=body.status, notes=body.notes)
    _event(a, "status", to=body.status)
    db.add(a)
    db.commit()
    return application_out(a, True)


@router.post("/from-offer/{offer_id}")
def from_offer(offer_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    o = db.get(JobOffer, offer_id)
    if not o or o.user_id != user.id:
        raise HTTPException(404)
    existing = db.scalar(select(Application).where(Application.user_id == user.id, Application.offer_id == o.id))
    if existing:
        return application_out(existing, True)
    a = Application(user_id=user.id, offer_id=o.id, company=o.company or "—", title=o.title, url=o.url, status="a_postuler")
    _event(a, "status", to="a_postuler", note=f"Ajoutée depuis l'offre (score {o.score}/100)")
    o.status = "applied"
    db.add(a)
    db.commit()
    return application_out(a, True)


@router.get("/{aid}")
def get_app(aid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return application_out(_own(db, user, aid), True)


class AppPatch(BaseModel):
    status: StatusT | None = None
    notes: str | None = Field(None, max_length=20000)
    next_action_at: datetime | None = None
    contacts: list[dict[str, Any]] | None = Field(None, max_length=30)
    company: str | None = Field(None, max_length=200)
    title: str | None = Field(None, max_length=300)


@router.patch("/{aid}")
def patch(aid: int, body: AppPatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = _own(db, user, aid)
    if body.status and body.status != a.status:
        _event(a, "status", **{"from": a.status, "to": body.status})
        a.status = body.status
        if body.status == "envoyee":
            a.applied_at = a.applied_at or datetime.now(timezone.utc)
            a.next_action_at = a.next_action_at or datetime.now(timezone.utc) + timedelta(days=7)
    if body.notes is not None and body.notes != a.notes:
        a.notes = body.notes
    if body.next_action_at is not None:
        a.next_action_at = body.next_action_at
    if body.contacts is not None:
        clean = [{k: str(v)[:300] for k, v in c.items() if k in ("name", "role", "email", "phone", "linkedin", "notes")} for c in body.contacts]
        a.contacts = clean
        _event(a, "contact", count=len(clean))
    for k in ("company", "title"):
        if getattr(body, k):
            setattr(a, k, getattr(body, k))
    db.commit()
    return application_out(a, True)


class NoteIn(BaseModel):
    text: str = Field(max_length=5000)
    kind: Literal["note", "email", "call", "interview"] = "note"


@router.post("/{aid}/events")
def add_event(aid: int, body: NoteIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = _own(db, user, aid)
    _event(a, body.kind, text=body.text)
    db.commit()
    return application_out(a, True)


@router.delete("/{aid}")
def delete(aid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_own(db, user, aid))
    db.commit()
    return {"ok": True}


class ValidateIn(BaseModel):
    cv_id: int | None = None
    letter_ids: list[int] = Field(default_factory=list, max_length=10)
    recipient: str = Field("", max_length=300)


def _app_dir(user_id: int, aid: int) -> Path:
    d = get_settings().storage_dir / "applications" / str(user_id) / str(aid)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _slug(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-")[:40] or "document"


@router.post("/{aid}/validate")
def validate(aid: int, body: ValidateIn, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Fige le dossier documentaire : copie exacte du CV et des messages, fichiers PDF/DOCX générés."""
    a = _own(db, user, aid)
    profile = get_profile(db, user.id)
    folder = _app_dir(user.id, a.id)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    created = []
    if body.cv_id:
        cv = db.get(CVVersion, body.cv_id)
        if not cv or cv.user_id != user.id:
            raise HTTPException(404, "CV introuvable")
        base = folder / f"CV-{_slug(a.company)}-{stamp}"
        base.with_suffix(".pdf").write_bytes(html_to_pdf(cv_html(cv.content, cv.template, cv.theme)))
        base.with_suffix(".docx").write_bytes(cv_docx(cv.content, cv.template, cv.theme))
        doc = ApplicationDocument(kind="cv", title=f"{cv.name} (rév. {cv.revision})",
                                  content={"cv": cv.content, "template": cv.template, "theme": cv.theme, "cv_id": cv.id, "revision": cv.revision},
                                  file_pdf=str(base.with_suffix(".pdf")), file_docx=str(base.with_suffix(".docx")))
        a.documents.append(doc)
        created.append(doc.title)
    sender = profile.get("identity", {})
    for lid in body.letter_ids:
        letter = db.get(Letter, lid)
        if not letter or letter.user_id != user.id:
            raise HTTPException(404, "Document introuvable")
        doc = ApplicationDocument(kind=letter.kind, title=f"{KIND_LABELS.get(letter.kind, letter.kind)} — {letter.title}",
                                  content={"body": letter.body, "style": letter.style, "letter_id": letter.id})
        if letter.kind == "letter":
            base = folder / f"Lettre-{_slug(a.company)}-{stamp}-{letter.id}"
            subject = f"Candidature — {a.title}"
            base.with_suffix(".pdf").write_bytes(html_to_pdf(letter_html(letter.body, sender, body.recipient or a.company, subject)))
            base.with_suffix(".docx").write_bytes(letter_docx(letter.body, sender, body.recipient or a.company, subject))
            doc.file_pdf, doc.file_docx = str(base.with_suffix(".pdf")), str(base.with_suffix(".docx"))
        a.documents.append(doc)
        created.append(doc.title)
    a.validated = True
    if a.status in ("a_analyser", "a_postuler"):
        _event(a, "status", **{"from": a.status, "to": "a_postuler"})
        a.status = "a_postuler"
    _event(a, "document", validated=created, note="Dossier validé par l'utilisateur")
    db.commit()
    audit(db, user.id, "application_validated", client_ip(request), application_id=a.id)
    return application_out(a, True)


@router.get("/{aid}/documents/{doc_id}/download")
def download(aid: int, doc_id: int, format: Literal["pdf", "docx"] = "pdf", user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = _own(db, user, aid)
    doc = next((d for d in a.documents if d.id == doc_id), None)
    if not doc:
        raise HTTPException(404)
    path = doc.file_pdf if format == "pdf" else doc.file_docx
    root = (get_settings().storage_dir / "applications" / str(user.id)).resolve()
    if not path or not Path(path).resolve().is_relative_to(root) or not Path(path).exists():
        raise HTTPException(404, "Fichier indisponible")
    media = "application/pdf" if format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(path, media_type=media, filename=Path(path).name)


class SendIn(BaseModel):
    to: EmailStr
    subject: str = Field(max_length=300)
    body: str = Field(max_length=20000)
    attach_document_ids: list[int] = Field(default_factory=list)
    confirm: bool = False


@router.post("/{aid}/send")
def send(aid: int, body: SendIn, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Envoi par email UNIQUEMENT après validation explicite (confirm=true) d'un dossier déjà figé."""
    a = _own(db, user, aid)
    if not body.confirm:
        raise HTTPException(400, "Confirmation explicite requise avant tout envoi")
    if not a.validated:
        raise HTTPException(400, "Validez d'abord le dossier de candidature")
    if not get_settings().smtp_host:
        raise HTTPException(400, "SMTP non configuré : envoyez depuis votre messagerie avec les fichiers téléchargés")
    attachments = []
    for d in a.documents:
        if d.id in body.attach_document_ids and d.file_pdf and Path(d.file_pdf).exists():
            attachments.append((Path(d.file_pdf).name, Path(d.file_pdf).read_bytes(), "application/pdf"))
    try:
        send_email(str(body.to), body.subject, body.body, attachments)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"Échec d'envoi : {e}") from e
    a.documents.append(ApplicationDocument(kind="email", title=f"Email envoyé à {body.to}", content={"to": str(body.to), "subject": body.subject, "body": body.body,
                                                                                                     "attachments": [x[0] for x in attachments]}))
    _event(a, "email", to=str(body.to), subject=body.subject)
    if a.status in ("a_analyser", "a_postuler"):
        _event(a, "status", **{"from": a.status, "to": "envoyee"})
        a.status, a.applied_at = "envoyee", datetime.now(timezone.utc)
        a.next_action_at = datetime.now(timezone.utc) + timedelta(days=7)
    db.commit()
    audit(db, user.id, "application_sent", client_ip(request), application_id=a.id, to=str(body.to))
    return application_out(a, True)
