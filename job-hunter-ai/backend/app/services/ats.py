"""Analyse ATS d'un CV : compatibilité avec l'offre + lisibilité machine. Aucune garantie de passage."""
from __future__ import annotations

import re
from typing import Any

from .cv_content import cv_plain_text
from .profile_data import profile_skill_set
from .skills import extract_skills, normalize

STANDARD_HEADINGS = {"summary", "skills", "experiences", "education"}


def analyze_cv(cv: dict[str, Any], template: str, profile: dict[str, Any], offer=None) -> dict[str, Any]:
    text = cv_plain_text(cv)
    n = normalize(text)
    present = set(extract_skills(text))
    have = profile_skill_set(profile)
    strengths: list[str] = []
    improvements: list[str] = []
    risks: list[str] = []

    match = None
    found, missing, to_add = [], [], []
    if offer:
        wanted_req = set(offer.skills_required or [])
        wanted = wanted_req | set(offer.skills_desired or [])
        found = sorted(wanted & present)
        missing = sorted(wanted - present)
        to_add = sorted((wanted & have) - present)  # vous les avez mais le CV ne les mentionne pas
        missing_truly = sorted(wanted - have)
        if wanted:
            req_cov = len(wanted_req & present) / len(wanted_req) if wanted_req else 1
            all_cov = len(wanted & present) / len(wanted)
            match = round(100 * (0.65 * req_cov + 0.35 * all_cov))
        title_terms = [w for w in re.findall(r"[a-z0-9+#]{4,}", normalize(offer.title)) if w not in ("alternance", "stage", "junior")]
        if title_terms and not any(t in n for t in title_terms):
            improvements.append("L'intitulé du poste (ou un équivalent) n'apparaît pas dans le CV : ajoutez-le au titre.")
        if to_add:
            improvements.append("Compétences que vous possédez, demandées par l'offre, mais absentes du CV : " + ", ".join(to_add))
        if missing_truly:
            risks.append("Exigences non couvertes par votre parcours (ne pas les ajouter artificiellement) : " + ", ".join(missing_truly))
    else:
        missing_truly = []

    # Lisibilité ATS
    read = 100
    if template not in ("minimal", "corporate", "infra", "cloud", "cyber", "data"):
        read -= 15
    visible = [s for s in cv.get("sections_order", []) if s not in cv.get("hidden", [])]
    if not STANDARD_HEADINGS.issubset(set(visible) | {"summary"}):
        read -= 10
        improvements.append("Gardez les rubriques standard (Compétences, Expérience, Formation).")
    ident = cv.get("identity", {})
    if not ident.get("email") or not ident.get("phone"):
        read -= 15
        risks.append("Coordonnées incomplètes (email / téléphone) : un ATS ou un recruteur ne pourra pas vous joindre.")
    if not ident.get("full_name"):
        read -= 10
        risks.append("Nom absent.")
    words = len(re.findall(r"\w+", text))
    if words > 900:
        read -= 10
        improvements.append(f"CV dense ({words} mots) : visez une page pour une alternance / un poste junior.")
    elif words < 150:
        read -= 10
        improvements.append(f"CV très court ({words} mots) : détaillez vos missions réelles.")
    for e in cv.get("experiences", []):
        if not e.get("title"):
            read -= 8
            risks.append(f"Intitulé de poste manquant pour l'expérience « {e.get('company') or '?'} ».")
        if not e.get("start"):
            read -= 4
            risks.append(f"Dates manquantes pour « {e.get('company') or e.get('title') or '?'} » : les ATS calculent l'expérience à partir des dates.")
        if len(e.get("bullets", [])) < 2:
            improvements.append(f"Expérience « {e.get('company') or e.get('title')} » : 2 à 4 puces de missions concrètes aident le recruteur.")
    if re.search(r"\bAD\b", text) and "Active Directory" not in text:
        improvements.append("Écrivez « Active Directory » en toutes lettres au moins une fois (les ATS cherchent souvent le terme complet).")
    if present:
        strengths.append(f"{len(present)} compétences techniques identifiables par un ATS.")
    if template in ("minimal", "corporate", "infra", "cyber", "data", "cloud"):
        strengths.append("Mise en page en une colonne, texte sélectionnable, sans jauges ni graphiques : favorable aux ATS.")
    if cv.get("summary"):
        strengths.append("Résumé de profil présent.")
    else:
        improvements.append("Ajoutez un résumé de 2–3 lignes orienté vers le poste visé.")
    return {
        "match_score": match, "ats_readability": max(0, read), "skills_found": found, "skills_missing": missing,
        "keywords_to_add": to_add, "not_in_profile": missing_truly, "strengths": strengths, "improvements": improvements,
        "risks": risks, "word_count": words,
        "disclaimer": "Les ATS diffèrent d'un recruteur à l'autre : ces scores sont indicatifs et ne garantissent pas le passage d'un filtre.",
    }
