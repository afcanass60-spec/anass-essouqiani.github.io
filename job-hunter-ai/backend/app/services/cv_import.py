"""Import de CV (PDF/DOCX) : extraction du texte puis proposition structurée.

Le résultat est une PROPOSITION : l'utilisateur la relit et choisit quoi fusionner dans son profil.
"""
from __future__ import annotations

import io
import re
from typing import Any

from .llm import LLMUnavailable, complete_json, wrap_untrusted
from .skills import extract_skills

MAX_UPLOAD = 8 * 1024 * 1024


def extract_text(filename: str, data: bytes) -> str:
    if len(data) > MAX_UPLOAD:
        raise ValueError("Fichier trop volumineux (8 Mo max)")
    name = filename.lower()
    if name.endswith(".pdf") or data[:4] == b"%PDF":
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        if len(reader.pages) > 10:
            raise ValueError("PDF trop long pour un CV (10 pages max)")
        return "\n".join((p.extract_text() or "") for p in reader.pages)
    if name.endswith(".docx") or data[:2] == b"PK":
        from docx import Document

        doc = Document(io.BytesIO(data))
        parts = [p.text for p in doc.paragraphs]
        for t in doc.tables:
            for row in t.rows:
                parts.append(" | ".join(c.text for c in row.cells))
        return "\n".join(parts)
    raise ValueError("Format non supporté : PDF ou DOCX uniquement")


HEADINGS = {
    "experiences": r"exp[ée]riences?( professionnelles?)?|parcours professionnel|work experience|experience",
    "education": r"formations?|dipl[oô]mes?|[ée]tudes|education|cursus",
    "skills": r"comp[ée]tences( techniques)?|skills|savoir-faire|outils|technologies",
    "certifications": r"certifications?",
    "languages": r"langues|languages",
    "projects": r"projets?|projects|r[ée]alisations",
    "interests": r"centres? d.int[ée]r[eê]ts?|loisirs|hobbies|int[ée]r[eê]ts",
    "summary": r"profil|r[ée]sum[ée]|[àa] propos|summary|about",
}


def heuristic_parse(text: str) -> dict[str, Any]:
    lines = [ln.strip() for ln in text.splitlines()]
    sections: dict[str, list[str]] = {"header": []}
    current = "header"
    for ln in lines:
        if not ln:
            continue
        key = next((k for k, pat in HEADINGS.items() if re.fullmatch(rf"\W*({pat})\W*", ln, re.I) and len(ln) < 45), None)
        if key:
            current = key
            sections.setdefault(key, [])
            continue
        sections.setdefault(current, []).append(ln)
    email = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    phone = re.search(r"(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}", text)
    linkedin = re.search(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-%]+", text)
    header = sections.get("header", [])
    return {
        "identity": {"full_name": header[0] if header and len(header[0]) < 60 else "", "email": email.group(0) if email else "",
                     "phone": phone.group(0) if phone else "", "linkedin": linkedin.group(0) if linkedin else ""},
        "skills_detected": extract_skills(text),
        "sections": {k: "\n".join(v) for k, v in sections.items() if v},
    }


IMPORT_SCHEMA = {
    "type": "object",
    "properties": {
        "identity": {"type": "object", "properties": {k: {"type": "string"} for k in ("full_name", "headline", "email", "phone", "city", "linkedin")},
                     "required": ["full_name", "headline", "email", "phone", "city", "linkedin"], "additionalProperties": False},
        "summary": {"type": "string"},
        "experiences": {"type": "array", "items": {"type": "object", "properties": {
            k: {"type": "string"} for k in ("title", "company", "location", "start", "end", "description")} | {"achievements": {"type": "array", "items": {"type": "string"}}, "skills": {"type": "array", "items": {"type": "string"}}},
            "required": ["title", "company", "location", "start", "end", "description", "achievements", "skills"], "additionalProperties": False}},
        "education": {"type": "array", "items": {"type": "object", "properties": {
            k: {"type": "string"} for k in ("degree", "school", "start", "end", "grade", "details", "status")} | {"level": {"type": "integer"}},
            "required": ["degree", "school", "start", "end", "grade", "details", "status", "level"], "additionalProperties": False}},
        "skills": {"type": "array", "items": {"type": "object", "properties": {"name": {"type": "string"}, "category": {"type": "string"}},
                                                "required": ["name", "category"], "additionalProperties": False}},
        "certifications": {"type": "array", "items": {"type": "object", "properties": {k: {"type": "string"} for k in ("name", "issuer", "date")},
                                                        "required": ["name", "issuer", "date"], "additionalProperties": False}},
        "languages": {"type": "array", "items": {"type": "object", "properties": {"name": {"type": "string"}, "level": {"type": "string"}},
                                                   "required": ["name", "level"], "additionalProperties": False}},
        "projects": {"type": "array", "items": {"type": "object", "properties": {"name": {"type": "string"}, "description": {"type": "string"}, "skills": {"type": "array", "items": {"type": "string"}}},
                                                  "required": ["name", "description", "skills"], "additionalProperties": False}},
        "interests": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["identity", "summary", "experiences", "education", "skills", "certifications", "languages", "projects", "interests"],
    "additionalProperties": False,
}

IMPORT_SYSTEM = """Tu extrais fidèlement les informations d'un CV vers une structure JSON.
Recopie, ne reformule pas, n'ajoute rien qui ne figure pas dans le texte. Champ inconnu -> chaîne vide.
education.status : "obtained" si le diplôme est obtenu, "in_progress" s'il est en cours. education.level : nombre d'années après le bac (BTS=2, Licence/Bachelor=3, Master=5), 0 si inconnu.
skills.category parmi : systemes, reseaux, cloud, devops, securite, virtualisation, methodes, outils, support, langages, data, soft, autre."""


def parse_cv(filename: str, data: bytes) -> dict[str, Any]:
    text = extract_text(filename, data)
    if len(text.strip()) < 50:
        raise ValueError("Aucun texte exploitable (CV scanné ? Utilisez un PDF texte ou un DOCX).")
    base = heuristic_parse(text)
    try:
        structured = complete_json(IMPORT_SYSTEM, "CV :\n" + wrap_untrusted("resume", text, 30000), IMPORT_SCHEMA, max_tokens=12000, effort="low")
        method = "ai"
    except LLMUnavailable as e:
        structured = None
        method = f"heuristic ({e})"
    return {"method": method, "text": text[:30000], "heuristic": base, "structured": structured}
