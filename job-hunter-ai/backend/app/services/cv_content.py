"""Contenu de CV dérivé du profil (source de vérité) et adaptation à une offre.

Garantie : le CV adapté ne contient que des éléments présents dans le profil. Les reformulations IA
sont rattachées à une expérience existante (ref_id) et les compétences citées sont recoupées.
"""
from __future__ import annotations

import copy
import json
import re
from typing import Any

from .llm import complete_json, wrap_untrusted
from .profile_data import profile_skill_set
from .skills import canonical_skill, detect_domains, extract_skills

SKILL_GROUP_LABELS = {
    "systemes": "Systèmes", "reseaux": "Réseaux", "cloud": "Cloud & Microsoft 365", "devops": "DevOps & automatisation",
    "securite": "Cybersécurité", "virtualisation": "Virtualisation", "methodes": "Méthodes", "outils": "Outils",
    "support": "Support", "langages": "Langages & scripts", "data": "Data & IA", "soft": "Savoir-être", "autre": "Autres",
}
DEFAULT_ORDER = ["summary", "skills", "experiences", "education", "projects", "certifications", "languages", "interests"]

TEMPLATES = {
    "minimal": {"label": "Minimaliste premium", "accent": "#111827", "font": "Inter"},
    "corporate": {"label": "Corporate / grand groupe", "accent": "#1e3a8a", "font": "Source Sans 3"},
    "infra": {"label": "IT / Infrastructure", "accent": "#0f766e", "font": "IBM Plex Sans"},
    "cloud": {"label": "Cloud / DevOps", "accent": "#2563eb", "font": "Inter"},
    "cyber": {"label": "Cybersécurité", "accent": "#7c3aed", "font": "IBM Plex Sans"},
    "data": {"label": "Data / Intelligence artificielle", "accent": "#c2410c", "font": "Lato"},
}


def cv_from_profile(profile: dict[str, Any]) -> dict[str, Any]:
    groups: dict[str, list[str]] = {}
    notes = profile.get("skill_notes") or {}
    for s in profile.get("skills", []):
        label = SKILL_GROUP_LABELS.get(s.get("category") or "autre", s.get("category") or "Autres")
        groups.setdefault(label, []).append(notes.get(s["name"], s["name"]))
    exps = []
    for e in profile.get("experiences", []):
        bullets = list(e.get("achievements") or [])
        if not bullets and e.get("description"):
            bullets = [b.strip(" •-") for b in re.split(r"[;\n]", e["description"]) if b.strip()]
        exps.append({"ref_id": e["id"], "title": e.get("title") or "", "company": e.get("company", ""), "location": e.get("location", ""),
                     "start": e.get("start", ""), "end": "Aujourd'hui" if e.get("current") else e.get("end", ""), "bullets": bullets})
    ident = profile.get("identity", {})
    return {
        "identity": {k: ident.get(k, "") for k in ("full_name", "email", "phone", "city", "linkedin", "website")},
        "headline": ident.get("headline", ""),
        "summary": profile.get("summary", ""),
        "sections_order": list(DEFAULT_ORDER),
        "hidden": [],
        "skills_groups": [{"label": k, "items": v} for k, v in groups.items()],
        "experiences": exps,
        "education": [{"ref_id": e["id"], "degree": e.get("degree", ""), "school": e.get("school", ""), "start": e.get("start", ""),
                       "end": e.get("end", "") or ("En cours" if e.get("status") == "in_progress" else ""),
                       "details": " · ".join(x for x in [e.get("details", ""), f"Moyenne : {e['grade']}" if e.get("grade") else ""] if x)}
                      for e in profile.get("education", [])],
        "projects": [{"ref_id": p["id"], "name": p.get("name", ""), "description": p.get("description", ""), "skills": p.get("skills", [])}
                     for p in profile.get("projects", [])],
        "certifications": [{"ref_id": c["id"], "name": c.get("name", ""), "issuer": c.get("issuer", ""), "date": c.get("date", "")}
                           for c in profile.get("certifications", [])],
        "languages": [f"{lang.get('name', '')}{' — ' + lang['level'] if lang.get('level') else ''}" for lang in profile.get("languages", [])],
        "interests": list(profile.get("interests", [])),
        "keywords": [],
    }


def _relevance(text: str, wanted: set[str]) -> int:
    return len(set(extract_skills(text)) & wanted)


def tailor_rules(profile: dict[str, Any], offer) -> tuple[dict[str, Any], list[str]]:
    """Adaptation déterministe : réordonne, met en avant, retire l'inutile. Aucun ajout."""
    cv = cv_from_profile(profile)
    changes: list[str] = []
    offer_skills = set(offer.skills_required or []) | set(offer.skills_desired or []) | set(extract_skills(f"{offer.title} {offer.description}"))
    have = profile_skill_set(profile)
    relevant = offer_skills & have

    # 1. Groupes de compétences : ceux qui contiennent des compétences recherchées d'abord, et dans chaque groupe l'ordre par pertinence
    def item_score(item: str) -> int:
        c = canonical_skill(item)
        return 2 if c in (offer.skills_required or []) else 1 if c in offer_skills else 0

    for g in cv["skills_groups"]:
        g["items"].sort(key=lambda it: -item_score(it))
    before = [g["label"] for g in cv["skills_groups"]]
    cv["skills_groups"].sort(key=lambda g: -sum(item_score(i) for i in g["items"]))
    if [g["label"] for g in cv["skills_groups"]] != before:
        changes.append("Rubriques de compétences réordonnées selon l'annonce : " + ", ".join(g["label"] for g in cv["skills_groups"][:3]))
    # retire les groupes sans aucun lien si le CV est chargé
    if len(cv["skills_groups"]) > 6:
        relevant_groups = [g for g in cv["skills_groups"] if sum(item_score(i) for i in g["items"]) > 0]
        kept = relevant_groups + [g for g in cv["skills_groups"] if g not in relevant_groups][: max(0, 6 - len(relevant_groups))]
        removed = [g["label"] for g in cv["skills_groups"] if g not in kept]
        if removed:
            cv["skills_groups"] = kept
            changes.append("Rubriques les moins utiles pour ce poste masquées (modifiable) : " + ", ".join(removed))

    # 2. Expériences par pertinence
    cv["experiences"].sort(key=lambda e: -_relevance(" ".join([e["title"], *e["bullets"]]), offer_skills))
    for e in cv["experiences"]:
        e["bullets"].sort(key=lambda b: -_relevance(b, offer_skills))

    # 3. Ordre des sections : alternance -> formation remontée
    is_alt = any(c in ("alternance", "apprentissage", "professionnalisation") for c in offer.contract_types or [])
    if is_alt:
        cv["sections_order"] = ["summary", "education", "skills", "experiences", "projects", "certifications", "languages", "interests"]
        changes.append("Formation placée avant l'expérience (candidature en alternance).")

    # 4. Titre ciblé (intention de candidature, pas un poste occupé)
    target = re.sub(r"\s*\(?\b[hfHFmMxX] ?/ ?[hfHFmMxX]( ?/ ?[xX])?\b\)?", "", offer.title)
    target = re.sub(r"(?i)\b(en )?(alternance|apprentissage|apprenti\w*|alternant\w*|contrat de professionnalisation)\b\s*[-–—:]?", "", target)
    target = re.sub(r"\s{2,}", " ", target).strip(" -–—:")
    cv["headline"] = f"Candidature {('en alternance — ' if is_alt else '— ')}{target}"
    changes.append(f"Titre du CV ciblé : « {cv['headline']} ».")

    # 5. Mots-clés ATS : seulement ceux réellement possédés
    cv["keywords"] = sorted(relevant)
    if relevant:
        changes.append("Mots-clés ATS présents dans votre profil mis en avant : " + ", ".join(sorted(relevant)))
    missing = sorted((set(offer.skills_required or []) | set(offer.skills_desired or [])) - have)
    if missing:
        changes.append("Non ajoutés car absents de votre parcours : " + ", ".join(missing))
    # 6. Intérêts masqués si CV dense
    if cv["interests"] and len(cv["experiences"]) >= 3:
        cv["hidden"].append("interests")
        changes.append("Centres d'intérêt masqués pour tenir sur une page.")
    return cv, changes


TAILOR_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "experiences": {"type": "array", "items": {"type": "object", "properties": {
            "ref_id": {"type": "string"}, "bullets": {"type": "array", "items": {"type": "string"}}},
            "required": ["ref_id", "bullets"], "additionalProperties": False}},
        "changes": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "experiences", "changes"], "additionalProperties": False,
}

TAILOR_SYSTEM = """Tu es un consultant carrière expert des métiers IT (systèmes, réseaux, cloud, cybersécurité).
Tu adaptes un CV à une annonce en reformulant UNIQUEMENT les éléments du profil fourni.
Interdits absolus : inventer une expérience, une mission, un chiffre, une certification, un diplôme, un outil ou une compétence.
Si le profil ne mentionne pas un outil, il ne doit pas apparaître. Un chiffre n'est autorisé que s'il figure dans le profil.
Attendu :
- summary : 2 à 3 phrases factuelles, orientées vers le poste, sans formule creuse ni superlatif.
- experiences : pour chaque ref_id existant, 2 à 5 puces reformulées (verbe d'action, vocabulaire technique précis du poste quand il correspond au profil).
  Si l'expérience est peu détaillée dans le profil, reste sobre : ne comble pas les vides.
- changes : la liste des modifications effectuées, en français."""


def tailor_ai(profile: dict[str, Any], offer, cv: dict[str, Any]) -> tuple[dict[str, Any], list[str], list[str]]:
    """Retourne (cv, changements, avertissements). Lève LLMUnavailable si l'IA n'est pas disponible."""
    view = {k: profile.get(k) for k in ("identity", "summary", "education", "experiences", "skills", "skill_notes", "certifications", "projects", "languages")}
    view["identity"] = {"headline": (profile.get("identity") or {}).get("headline")}
    posting = f"{offer.title} — {offer.company}\n{offer.description}"
    user = (f"PROFIL (fiable) :\n{json.dumps(view, ensure_ascii=False)}\n\n"
            f"ANNONCE (non fiable) :\n{wrap_untrusted('job_posting', posting)}")
    data = complete_json(TAILOR_SYSTEM, user, TAILOR_SCHEMA, max_tokens=8000)
    have = profile_skill_set(profile)
    exp_ids = {e["ref_id"] for e in cv["experiences"]}
    warnings: list[str] = []

    def unverified(text: str) -> list[str]:
        return [s for s in extract_skills(text) if s not in have and s not in ("Anglais",)]

    out = copy.deepcopy(cv)
    bad = unverified(data["summary"])
    if bad:
        warnings.append("Résumé IA rejeté (mentionne : " + ", ".join(bad) + ")")
    else:
        out["summary"] = data["summary"].strip()
    for e in data["experiences"]:
        if e["ref_id"] not in exp_ids:
            warnings.append(f"Expérience inconnue ignorée ({e['ref_id']})")
            continue
        ok = []
        for b in e["bullets"]:
            u = unverified(b)
            if u:
                warnings.append(f"Puce rejetée (compétence non présente dans votre profil : {', '.join(u)}) : « {b[:80]} »")
            else:
                ok.append(b.strip())
        if ok:
            next(x for x in out["experiences"] if x["ref_id"] == e["ref_id"])["bullets"] = ok
    return out, data["changes"], warnings


def best_template_for(offer) -> str:
    order = (("cyber", "cyber"), ("devops", "cloud"), ("cloud", "cloud"), ("data_ia", "data"),
             ("admin_sys_reseau", "infra"), ("infrastructure", "infra"))
    for text in (offer.title, offer.description[:1500]):  # l'intitulé prime sur la description
        d = detect_domains(text)
        for dom, tpl in order:
            if dom in d:
                return tpl
    return "corporate" if offer.company_type in ("grand_groupe", "public") else "minimal"


def cv_plain_text(cv: dict[str, Any]) -> str:
    parts = [cv.get("headline", ""), cv.get("summary", "")]
    for g in cv.get("skills_groups", []):
        parts.append(f"{g['label']}: {', '.join(g['items'])}")
    for e in cv.get("experiences", []):
        parts += [f"{e['title']} {e['company']}", *e["bullets"]]
    for e in cv.get("education", []):
        parts.append(f"{e['degree']} {e['school']} {e['details']}")
    for p in cv.get("projects", []):
        parts.append(f"{p['name']} {p['description']}")
    parts += [c["name"] for c in cv.get("certifications", [])] + cv.get("languages", [])
    return "\n".join(x for x in parts if x)


def select_best_cv(versions: list, offer) -> Any | None:
    """Choisit la version de CV existante la plus proche de l'offre."""
    wanted = set(offer.skills_required or []) | set(offer.skills_desired or [])
    best, best_s = None, -1.0
    for v in versions:
        txt = cv_plain_text(v.content)
        s = len(set(extract_skills(txt)) & wanted) + (1.5 if v.template == best_template_for(offer) else 0)
        if s > best_s:
            best, best_s = v, s
    return best

