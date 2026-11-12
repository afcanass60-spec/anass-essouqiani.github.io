"""AI Career Studio : CV (bibliothèque, versions, éditeur, export), lettres & messages, agent de candidature."""
from __future__ import annotations

import difflib
import json
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import current_user
from ..models import CVRevision, CVVersion, JobOffer, Letter, User
from ..services import agent as agent_svc
from ..services.ats import analyze_cv
from ..services.cv_content import TEMPLATES, best_template_for, cv_from_profile, cv_plain_text, select_best_cv, tailor_ai, tailor_rules
from ..services.letters import KIND_LABELS, STYLES, analyze_letter, generate
from ..services.llm import LLMUnavailable
from ..services.pipeline import get_profile
from ..services.render import FONTS, cv_docx, cv_html, html_to_pdf, letter_docx, letter_html
from .serializers import cv_out, letter_out

router = APIRouter(prefix="/api/studio", tags=["studio"])
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _offer(db: Session, user: User, oid: int | None) -> JobOffer | None:
    if oid is None:
        return None
    o = db.get(JobOffer, oid)
    if not o or o.user_id != user.id:
        raise HTTPException(404, "Offre introuvable")
    return o


def _cv(db: Session, user: User, cid: int) -> CVVersion:
    v = db.get(CVVersion, cid)
    if not v or v.user_id != user.id:
        raise HTTPException(404, "CV introuvable")
    return v


# ---------------------------------------------------------------- CV
@router.get("/templates")
def templates(user: User = Depends(current_user)):
    return {"templates": [{"key": k, **v} for k, v in TEMPLATES.items()], "fonts": FONTS,
            "styles": [{"key": k, "description": v} for k, v in STYLES.items()],
            "kinds": [{"key": k, "label": v} for k, v in KIND_LABELS.items()]}


@router.get("/cvs")
def list_cvs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(CVVersion).where(CVVersion.user_id == user.id).order_by(CVVersion.updated_at.desc())).all()
    return [cv_out(v, full=False) for v in rows]


class CVCreate(BaseModel):
    name: str = Field(max_length=200)
    template: str = "minimal"
    from_cv_id: int | None = None


@router.post("/cvs")
def create_cv(body: CVCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.from_cv_id:
        src = _cv(db, user, body.from_cv_id)
        content, theme, tpl = json.loads(json.dumps(src.content)), dict(src.theme), src.template
    else:
        content, theme, tpl = cv_from_profile(get_profile(db, user.id)), {}, body.template
    v = CVVersion(user_id=user.id, name=body.name, template=tpl if tpl in TEMPLATES else "minimal", theme=theme, content=content)
    db.add(v)
    db.commit()
    return cv_out(v)


@router.get("/cvs/{cid}")
def get_cv(cid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return cv_out(_cv(db, user, cid))


class CVSave(BaseModel):
    name: str = Field(max_length=200)
    template: str
    theme: dict[str, Any] = Field(default_factory=dict)
    content: dict[str, Any]
    note: str = Field("", max_length=300)


@router.put("/cvs/{cid}")
def save_cv(cid: int, body: CVSave, user: User = Depends(current_user), db: Session = Depends(get_db)):
    v = _cv(db, user, cid)
    if len(json.dumps(body.content)) > 200_000:
        raise HTTPException(413, "Contenu trop volumineux")
    db.add(CVRevision(cv_id=v.id, revision=v.revision, content=v.content, template=v.template, theme=v.theme, note=body.note or "Modification"))
    v.name, v.template, v.theme, v.content = body.name, body.template if body.template in TEMPLATES else "minimal", body.theme, body.content
    v.revision += 1
    db.commit()
    return cv_out(v)


@router.delete("/cvs/{cid}")
def delete_cv(cid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_cv(db, user, cid))
    db.commit()
    return {"ok": True}


@router.get("/cvs/{cid}/revisions")
def cv_revisions(cid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    v = _cv(db, user, cid)
    rows = db.scalars(select(CVRevision).where(CVRevision.cv_id == v.id).order_by(CVRevision.revision.desc())).all()
    return [{"id": r.id, "revision": r.revision, "note": r.note, "created_at": r.created_at.isoformat()} for r in rows]


@router.post("/cvs/{cid}/revisions/{rid}/restore")
def restore_cv(cid: int, rid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    v = _cv(db, user, cid)
    r = db.get(CVRevision, rid)
    if not r or r.cv_id != v.id:
        raise HTTPException(404)
    db.add(CVRevision(cv_id=v.id, revision=v.revision, content=v.content, template=v.template, theme=v.theme, note=f"Avant restauration rév. {r.revision}"))
    v.content, v.template, v.theme, v.revision = r.content, r.template, r.theme, v.revision + 1
    db.commit()
    return cv_out(v)


@router.get("/cvs/{cid}/compare/{other}")
def compare(cid: int, other: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a, b = _cv(db, user, cid), _cv(db, user, other)
    la, lb = cv_plain_text(a.content).splitlines(), cv_plain_text(b.content).splitlines()
    diff = [{"op": line[0], "text": line[2:]} for line in difflib.ndiff(la, lb) if line[:1] in ("+", "-", " ")]
    return {"a": cv_out(a, False), "b": cv_out(b, False), "diff": diff,
            "similarity": round(100 * difflib.SequenceMatcher(None, "\n".join(la), "\n".join(lb)).ratio())}


class PreviewIn(BaseModel):
    template: str = "minimal"
    theme: dict[str, Any] = Field(default_factory=dict)
    content: dict[str, Any]


@router.post("/cv-preview", response_class=HTMLResponse)
def preview(body: PreviewIn, user: User = Depends(current_user)):
    html = cv_html(body.content, body.template, body.theme)
    return HTMLResponse(html, headers={"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'"})


@router.get("/cvs/{cid}/export")
def export_cv(cid: int, format: Literal["pdf", "docx", "html"] = "pdf", user: User = Depends(current_user), db: Session = Depends(get_db)):
    v = _cv(db, user, cid)
    name = "".join(c if c.isascii() and c.isalnum() else "-" for c in v.name)[:50]
    if format == "docx":
        return Response(cv_docx(v.content, v.template, v.theme), media_type=DOCX, headers={"Content-Disposition": f'attachment; filename="{name}.docx"'})
    html = cv_html(v.content, v.template, v.theme)
    if format == "html":
        return HTMLResponse(html)
    return Response(html_to_pdf(html), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{name}.pdf"'})


@router.post("/cvs/{cid}/analyze")
def analyze(cid: int, offer_id: int | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    v = _cv(db, user, cid)
    return analyze_cv(v.content, v.template, get_profile(db, user.id), _offer(db, user, offer_id))


class TailorIn(BaseModel):
    offer_id: int
    base_cv_id: int | None = None
    use_ai: bool = True


@router.post("/cvs/tailor")
def tailor(body: TailorIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Crée une version de CV adaptée à l'offre (proposition modifiable)."""
    offer = _offer(db, user, body.offer_id)
    profile = get_profile(db, user.id)
    versions = db.scalars(select(CVVersion).where(CVVersion.user_id == user.id)).all()
    base = _cv(db, user, body.base_cv_id) if body.base_cv_id else select_best_cv([v for v in versions if v.origin != "tailored"], offer)
    cv, changes = tailor_rules(profile, offer)
    if base:  # conserve l'identité / les choix éditoriaux de la version de base
        cv["identity"] = {**cv["identity"], **{k: val for k, val in (base.content.get("identity") or {}).items() if val}}
        cv["interests"] = base.content.get("interests", cv["interests"])
    warnings: list[str] = []
    method = "rules"
    if body.use_ai:
        try:
            cv, ai_changes, warnings = tailor_ai(profile, offer, cv)
            changes += ai_changes
            method = "hybrid"
        except LLMUnavailable as e:
            warnings.append(f"IA indisponible : adaptation par règles uniquement ({e}).")
    template = best_template_for(offer)
    v = CVVersion(user_id=user.id, name=f"CV — {offer.company or 'Entreprise'} — {offer.title[:60]}", template=template,
                  theme=dict(base.theme) if base else {}, content=cv, target_offer_id=offer.id, origin="tailored")
    db.add(v)
    db.commit()
    return {"cv": cv_out(v), "changes": changes, "warnings": warnings, "method": method,
            "base_cv": cv_out(base, False) if base else None,
            "analysis": analyze_cv(cv, template, profile, offer)}


# ---------------------------------------------------------------- Lettres & messages
class GenerateIn(BaseModel):
    offer_id: int | None = None
    kind: Literal["letter", "email", "linkedin", "form", "followup", "reply", "thanks"] = "letter"
    style: str = "professionnel"
    company_info: str = Field("", max_length=8000)
    context: str = Field("", max_length=8000)
    instructions: str = Field("", max_length=1500)


@router.post("/letters/generate")
def gen_letter(body: GenerateIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    offer = _offer(db, user, body.offer_id)
    profile = get_profile(db, user.id)
    out = generate(profile, offer, body.kind, body.style, body.company_info, body.context, body.instructions)
    cv = db.scalar(select(CVVersion).where(CVVersion.user_id == user.id, CVVersion.target_offer_id == body.offer_id)) if body.offer_id else None
    analysis = analyze_letter(out["body"], profile, offer, cv_plain_text(cv.content) if cv else "") if body.kind == "letter" else {}
    letter = Letter(user_id=user.id, offer_id=offer.id if offer else None, kind=body.kind, style=body.style,
                    title=out["subject"][:300], body=out["body"], generated_by=out["generated_by"], analysis=analysis)
    db.add(letter)
    db.commit()
    return {**letter_out(letter), "warnings": out.get("warnings", []), "hook_rationale": out.get("hook_rationale"), "facts_used": out.get("facts_used", [])}


@router.get("/letters")
def list_letters(offer_id: int | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(Letter).where(Letter.user_id == user.id)
    if offer_id:
        q = q.where(Letter.offer_id == offer_id)
    return [letter_out(x) for x in db.scalars(q.order_by(Letter.updated_at.desc()).limit(200)).all()]


def _letter(db: Session, user: User, lid: int) -> Letter:
    x = db.get(Letter, lid)
    if not x or x.user_id != user.id:
        raise HTTPException(404)
    return x


@router.get("/letters/{lid}")
def get_letter(lid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return letter_out(_letter(db, user, lid))


class LetterSave(BaseModel):
    title: str = Field(max_length=300)
    body: str = Field(max_length=20000)


@router.put("/letters/{lid}")
def save_letter(lid: int, body: LetterSave, user: User = Depends(current_user), db: Session = Depends(get_db)):
    x = _letter(db, user, lid)
    x.title, x.body = body.title, body.body
    if x.generated_by != "manual" and x.generated_by != "ai+edited":
        x.generated_by = "ai+edited" if x.generated_by == "ai" else "manual"
    if x.kind == "letter":
        offer = _offer(db, user, x.offer_id)
        cv = db.scalar(select(CVVersion).where(CVVersion.user_id == user.id, CVVersion.target_offer_id == x.offer_id)) if x.offer_id else None
        x.analysis = analyze_letter(x.body, get_profile(db, user.id), offer, cv_plain_text(cv.content) if cv else "")
    db.commit()
    return letter_out(x)


@router.delete("/letters/{lid}")
def delete_letter(lid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_letter(db, user, lid))
    db.commit()
    return {"ok": True}


@router.get("/letters/{lid}/export")
def export_letter(lid: int, format: Literal["pdf", "docx"] = "pdf", recipient: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    x = _letter(db, user, lid)
    offer = _offer(db, user, x.offer_id)
    sender = get_profile(db, user.id).get("identity", {})
    subject = f"Candidature — {offer.title}" if offer else x.title
    rcpt = recipient[:300] or (offer.company if offer else "")
    if format == "docx":
        return Response(letter_docx(x.body, sender, rcpt, subject), media_type=DOCX, headers={"Content-Disposition": f'attachment; filename="lettre-{x.id}.docx"'})
    return Response(html_to_pdf(letter_html(x.body, sender, rcpt, subject)), media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="lettre-{x.id}.pdf"'})


# ---------------------------------------------------------------- Agent de candidature
@router.post("/prepare/{offer_id}")
def prepare(offer_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Analyse de l'offre, mots-clés ATS, préparation des entretiens."""
    offer = _offer(db, user, offer_id)
    return agent_svc.prepare(get_profile(db, user.id), offer)
