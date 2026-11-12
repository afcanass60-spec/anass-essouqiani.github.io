"""Rendu des documents : HTML (aperçu temps réel), PDF (WeasyPrint) et DOCX (python-docx)."""
from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .cv_content import TEMPLATES

_env = Environment(loader=FileSystemLoader(Path(__file__).resolve().parent.parent / "templates"),
                   autoescape=select_autoescape(["html"]))
SAFE_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
FONTS = ["Inter", "Source Sans 3", "IBM Plex Sans", "Lato", "Roboto", "Open Sans", "Georgia", "Merriweather"]


def resolve_theme(template: str, theme: dict[str, Any] | None) -> dict[str, Any]:
    base = TEMPLATES.get(template, TEMPLATES["minimal"])
    t = theme or {}
    accent = t.get("accent") if isinstance(t.get("accent"), str) and SAFE_COLOR.match(t.get("accent", "")) else base["accent"]
    font = t.get("font") if t.get("font") in FONTS else base["font"]
    size = float(t.get("font_size") or 10)
    margin = float(t.get("margin") or 14)
    return {"accent": accent, "font": font, "font_size": max(8.5, min(12, size)), "margin": max(8, min(22, margin))}


def cv_html(cv: dict[str, Any], template: str, theme: dict[str, Any] | None) -> str:
    tpl = template if template in TEMPLATES else "minimal"
    return _env.get_template("cv/cv.html").render(cv=cv, template=tpl, theme=resolve_theme(tpl, theme))


def html_to_pdf(html: str) -> bytes:
    from weasyprint import HTML

    return HTML(string=html, base_url=None).write_pdf()


def letter_html(body: str, sender: dict[str, Any], recipient: str, subject: str, theme: dict[str, Any] | None = None) -> str:
    th = resolve_theme("minimal", theme)
    tpl = _env.from_string("""<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 22mm 22mm; } body { font-family: "{{ th.font }}", "Inter", "DejaVu Sans", sans-serif; font-size: 10.8pt; line-height: 1.55; color: #111827; }
.sender { margin-bottom: 10mm; } .sender strong { font-size: 12pt; } .muted { color: #4b5563; font-size: 9.5pt; }
.recipient { margin: 0 0 8mm auto; width: 70mm; } .subject { font-weight: 600; margin-bottom: 6mm; color: {{ th.accent }}; }
p { margin: 0 0 3.5mm; text-align: justify; }</style></head><body>
<div class="sender"><strong>{{ s.full_name }}</strong><div class="muted">{{ [s.city, s.phone, s.email] | select | join(" · ") }}</div></div>
{% if recipient %}<div class="recipient">{{ recipient }}</div>{% endif %}
{% if subject %}<div class="subject">Objet : {{ subject }}</div>{% endif %}
{% for p in paragraphs %}<p>{{ p }}</p>{% endfor %}</body></html>""")
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    return tpl.render(th=th, s=sender, recipient=recipient, subject=subject, paragraphs=paragraphs)


def _rgb(hex_color: str):
    from docx.shared import RGBColor

    h = hex_color.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def cv_docx(cv: dict[str, Any], template: str, theme: dict[str, Any] | None) -> bytes:
    from docx import Document
    from docx.enum.text import WD_TAB_ALIGNMENT
    from docx.shared import Mm, Pt

    th = resolve_theme(template, theme)
    doc = Document()
    sec = doc.sections[0]
    sec.page_height, sec.page_width = Mm(297), Mm(210)
    for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(sec, side, Mm(th["margin"]))
    normal = doc.styles["Normal"]
    normal.font.name = th["font"]
    normal.font.size = Pt(th["font_size"])
    normal.paragraph_format.space_after = Pt(1)
    accent = _rgb(th["accent"])

    p = doc.add_paragraph()
    r = p.add_run(cv["identity"].get("full_name") or "Prénom Nom")
    r.bold, r.font.size = True, Pt(20)
    if cv.get("headline"):
        r = doc.add_paragraph().add_run(cv["headline"])
        r.font.color.rgb, r.bold = accent, True
    contact = "  ·  ".join(cv["identity"].get(k) for k in ("city", "phone", "email", "linkedin", "website") if cv["identity"].get(k))
    if contact:
        doc.add_paragraph(contact).runs[0].font.size = Pt(9)

    def heading(text: str):
        hp = doc.add_paragraph()
        hp.paragraph_format.space_before = Pt(8)
        hr = hp.add_run(text.upper())
        hr.bold, hr.font.size, hr.font.color.rgb = True, Pt(9.5), accent

    def dated(title: str, sub: str, dates: str):
        dp = doc.add_paragraph()
        dp.paragraph_format.tab_stops.add_tab_stop(Mm(210 - 2 * th["margin"]), WD_TAB_ALIGNMENT.RIGHT)
        t = dp.add_run(title)
        t.bold = True
        if sub:
            dp.add_run(f" — {sub}")
        if dates:
            dp.add_run(f"\t{dates}").font.size = Pt(9)

    for s in cv.get("sections_order", []):
        if s in cv.get("hidden", []):
            continue
        if s == "summary" and cv.get("summary"):
            heading("Profil")
            doc.add_paragraph(cv["summary"])
        elif s == "skills" and cv.get("skills_groups"):
            heading("Compétences")
            for g in cv["skills_groups"]:
                if g["items"]:
                    gp = doc.add_paragraph()
                    gp.add_run(f"{g['label']} : ").bold = True
                    gp.add_run(", ".join(g["items"]))
        elif s == "experiences" and cv.get("experiences"):
            heading("Expérience professionnelle")
            for e in cv["experiences"]:
                dated(e.get("title") or "Poste", ", ".join(x for x in [e.get("company"), e.get("location")] if x),
                      " – ".join(x for x in [e.get("start"), e.get("end")] if x))
                for b in e.get("bullets", []):
                    doc.add_paragraph(b, style="List Bullet")
        elif s == "education" and cv.get("education"):
            heading("Formation")
            for e in cv["education"]:
                dated(e["degree"], e.get("school", ""), " – ".join(x for x in [e.get("start"), e.get("end")] if x))
                if e.get("details"):
                    doc.add_paragraph(e["details"])
        elif s == "projects" and cv.get("projects"):
            heading("Projets")
            for pr in cv["projects"]:
                pp = doc.add_paragraph()
                pp.add_run(pr["name"]).bold = True
                if pr.get("description"):
                    pp.add_run(f" — {pr['description']}")
        elif s == "certifications" and cv.get("certifications"):
            heading("Certifications")
            for c in cv["certifications"]:
                dated(c["name"], c.get("issuer", ""), c.get("date", ""))
        elif s == "languages" and cv.get("languages"):
            heading("Langues")
            doc.add_paragraph("  ·  ".join(cv["languages"]))
        elif s == "interests" and cv.get("interests"):
            heading("Centres d'intérêt")
            doc.add_paragraph("  ·  ".join(cv["interests"]))
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def letter_docx(body: str, sender: dict[str, Any], recipient: str, subject: str) -> bytes:
    from docx import Document
    from docx.shared import Mm, Pt

    doc = Document()
    sec = doc.sections[0]
    sec.page_height, sec.page_width = Mm(297), Mm(210)
    for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(sec, side, Mm(22))
    doc.styles["Normal"].font.name = "Inter"
    doc.styles["Normal"].font.size = Pt(11)
    p = doc.add_paragraph()
    p.add_run(sender.get("full_name") or "").bold = True
    info = " · ".join(x for x in [sender.get("city"), sender.get("phone"), sender.get("email")] if x)
    if info:
        doc.add_paragraph(info)
    if recipient:
        rp = doc.add_paragraph(recipient)
        rp.paragraph_format.left_indent = Mm(95)
    if subject:
        doc.add_paragraph().add_run(f"Objet : {subject}").bold = True
    for para in [x.strip() for x in re.split(r"\n\s*\n", body) if x.strip()]:
        doc.add_paragraph(para)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
