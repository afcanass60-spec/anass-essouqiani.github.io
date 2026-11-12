"""Moteur de matching : score déterministe sur 100 + affinage IA optionnel (hybride).

Barème : compétences 30 · formation 20 · expérience 15 · missions 15 · localisation 10 · contrat 10.
Le score n'est JAMAIS gonflé : l'IA ne peut s'écarter que de ±25 % du barème de chaque critère
par rapport aux règles, et les compétences qu'elle déclare « couvertes » sont recoupées avec le profil.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

from ..config import get_settings
from .geo import haversine_km
from .llm import LLMUnavailable, complete_json, detect_injection, wrap_untrusted
from .normalize import PRESET_LOCATIONS
from .profile_data import education_levels, experience_years, profile_skill_set
from .skills import DOMAIN_LABELS, detect_domains, extract_skills, normalize

log = logging.getLogger(__name__)

WEIGHTS = {"competences": 30, "formation": 20, "experience": 15, "missions": 15, "localisation": 10, "contrat": 10}
LABELS = {"competences": "Compétences techniques", "formation": "Formation", "experience": "Expérience",
          "missions": "Missions proposées", "localisation": "Localisation", "contrat": "Type de contrat & conditions"}

# Compétences « voisines » : partiellement transférables (crédit 50 %)
RELATED = {
    "VMware": {"Proxmox", "Virtualisation", "VirtualBox"}, "Hyper-V": {"Proxmox", "Virtualisation", "Windows Server"},
    "AWS": {"Microsoft Azure", "Cloud Computing"}, "GCP": {"Microsoft Azure", "Cloud Computing"},
    "Exchange": {"Microsoft 365"}, "Intune / MDM": {"Microsoft 365"}, "Cisco": {"VLAN", "Réseaux TCP/IP"},
    "Routage / Switching": {"VLAN", "Réseaux TCP/IP"}, "Pare-feu": {"DMZ", "Cybersécurité"},
    "ITSM / Ticketing": {"GLPI", "ITIL"}, "Support N2": {"Support utilisateurs"},
    "Kubernetes": {"Docker"}, "Ansible": {"DevOps"}, "Terraform / IaC": {"DevOps", "Microsoft Azure"},
    "Supervision": {"Linux", "Windows Server"}, "Wi-Fi": {"802.1X", "Réseaux TCP/IP"},
}
HARD_BLOCKERS = [
    (r"habilitation (secret|defense)|habilitable", "Habilitation défense requise (vérifier l'éligibilité)"),
    (r"nationalite (francaise|europeenne) (exigee|obligatoire)", "Condition de nationalité"),
    (r"astreintes?", "Astreintes mentionnées"),
]


def category(score: int) -> str:
    if score >= 90:
        return "Excellent match"
    if score >= 80:
        return "Très bon match"
    if score >= 70:
        return "Bon match"
    if score >= 60:
        return "Match moyen"
    return "Faible correspondance"


def _location_point(offer) -> tuple[float, float] | None:
    if offer.latitude is not None and offer.longitude is not None:
        return offer.latitude, offer.longitude
    return None


def rule_score(offer, profile: dict[str, Any]) -> dict[str, Any]:
    prefs = profile.get("preferences", {}) or {}
    text = f"{offer.title}\n{offer.description}"
    have = profile_skill_set(profile)
    notes: dict[str, list[str]] = {k: [] for k in WEIGHTS}
    pts: dict[str, float] = {}

    # 1) Compétences (30)
    required = list(dict.fromkeys(offer.skills_required or []))
    desired = [s for s in dict.fromkeys(offer.skills_desired or []) if s not in required]
    if not required and not desired:
        found = extract_skills(text)
        desired = found
    matched_req = [s for s in required if s in have]
    matched_des = [s for s in desired if s in have]
    partial = [s for s in required + desired if s not in have and RELATED.get(s, set()) & have]
    missing_req = [s for s in required if s not in have]
    missing_des = [s for s in desired if s not in have]
    total_w = 2 * len(required) + len(desired)
    it_related = bool(detect_domains(text[:4000]))
    if total_w == 0:
        pts["competences"] = 12.0 if it_related else 2.0
        notes["competences"].append("Aucune compétence technique identifiable dans l'annonce" + (" : évaluation neutre." if it_related else " (poste hors IT ?)."))
    else:
        got = 2 * len(matched_req) + len(matched_des)
        got += sum(1.0 if s in required else 0.5 for s in partial)  # 50 % de crédit pour les voisines
        pts["competences"] = WEIGHTS["competences"] * min(1.0, got / total_w)
        if matched_req:
            notes["competences"].append("Indispensables couvertes : " + ", ".join(matched_req))
        if matched_des:
            notes["competences"].append("Souhaitées couvertes : " + ", ".join(matched_des))
        if partial:
            notes["competences"].append("Proches de votre parcours (transférables) : " + ", ".join(partial))
        if missing_req:
            notes["competences"].append("Indispensables manquantes : " + ", ".join(missing_req))

    # 2) Formation (20)
    obtained, in_progress = education_levels(profile)
    req_level = offer.education_level
    is_alt = any(c in ("alternance", "apprentissage", "professionnalisation") for c in offer.contract_types or [])
    if req_level is None:
        pts["formation"] = 14.0
        notes["formation"].append("Niveau d'études non précisé.")
    elif req_level <= obtained:
        pts["formation"] = 20.0
        notes["formation"].append(f"Bac+{req_level} demandé : votre diplôme obtenu (Bac+{obtained}) suffit.")
    elif in_progress and req_level <= in_progress and is_alt:
        pts["formation"] = 20.0
        notes["formation"].append(f"Alternance préparant un Bac+{req_level} : cohérent avec votre formation en cours.")
    elif in_progress and req_level <= in_progress:
        pts["formation"] = 13.0
        notes["formation"].append(f"Bac+{req_level} demandé : diplôme en cours d'obtention (pas encore obtenu).")
    elif is_alt and req_level == (in_progress or obtained) + 1:
        pts["formation"] = 10.0
        notes["formation"].append(f"Alternance de niveau Bac+{req_level} : nécessite une poursuite d'études à ce niveau.")
    else:
        pts["formation"] = 5.0 if req_level - max(obtained, in_progress or 0) <= 2 else 2.0
        notes["formation"].append(f"Bac+{req_level} demandé : au-dessus de votre niveau actuel.")

    # 3) Expérience (15)
    my_years = experience_years(profile)
    req_years = offer.experience_years
    if offer.beginner_ok or req_years == 0 or (req_years is None and is_alt):
        pts["experience"] = 15.0
        notes["experience"].append("Débutants / profils juniors acceptés." if not is_alt else "Alternance : expérience non exigée.")
    elif req_years is None:
        pts["experience"] = 10.0
        notes["experience"].append("Expérience demandée non précisée.")
    elif req_years <= my_years + 0.5:
        pts["experience"] = 14.0
        notes["experience"].append(f"{req_years:g} an(s) demandé(s) : compatible.")
    elif req_years <= my_years + 2:
        pts["experience"] = 8.0
        notes["experience"].append(f"{req_years:g} ans demandés : un peu au-dessus de votre expérience.")
    else:
        pts["experience"] = 2.0 if req_years >= 5 else 4.0
        notes["experience"].append(f"{req_years:g} ans d'expérience demandés : écart important.")
    if re.search(r"\bsenior\b|\blead\b|\bexpert\b|\barchitecte\b|\bmanager\b", normalize(offer.title)) and not is_alt:
        pts["experience"] = min(pts["experience"], 3.0)
        notes["experience"].append("Intitulé de niveau senior/lead.")

    # 4) Missions (15)
    target = set(prefs.get("domains") or [])
    title_domains = detect_domains(offer.title)
    desc_domains = detect_domains(offer.description[:4000])
    hits = [d for d in title_domains if d in target] or [d for d in desc_domains if d in target]
    if hits:
        base = 11.0 if any(d in target for d in title_domains) else 7.0
        overlap = len(set(extract_skills(offer.description)) & have)
        pts["missions"] = min(15.0, base + min(4.0, overlap * 0.8))
        notes["missions"].append("Domaine : " + ", ".join(DOMAIN_LABELS[d] for d in dict.fromkeys(hits)))
        if "data_ia" in hits and not ({"Python", "SQL", "Data Engineering"} & have):
            pts["missions"] = min(pts["missions"], 7.0)
            notes["missions"].append("Poste data/IA : vérifier le niveau de qualification demandé.")
        if re.search(r"\bn1\b|niveau 1|hotline", normalize(offer.description)) and not re.search(r"n2|niveau 2", normalize(offer.description)):
            pts["missions"] -= 3
            notes["missions"].append("Support de niveau 1 principalement.")
    else:
        pts["missions"] = 2.0
        notes["missions"].append("Missions hors de vos domaines cibles.")

    # 5) Localisation (10)
    if offer.work_mode == "remote":
        pts["localisation"] = 10.0
        notes["localisation"].append("Télétravail complet.")
    elif offer.travel_minutes is not None:
        t = offer.travel_minutes
        pts["localisation"] = 10.0 if t <= 30 else 9.0 if t <= 45 else 7.0 if t <= 60 else 4.0 if t <= 90 else 1.0
        notes["localisation"].append(f"Trajet estimé : {t} min ({offer.travel_source}).")
    else:
        pt = _location_point(offer)
        home = prefs.get("home") or {}
        ref_points = []
        if home.get("lat") is not None:
            ref_points.append((home["lat"], home["lon"]))
        ref_points += [PRESET_LOCATIONS[c] for c in prefs.get("locations", []) if c in PRESET_LOCATIONS and c != "Île-de-France"]
        if pt and ref_points:
            d = min(haversine_km(pt, r) for r in ref_points)
            radius = prefs.get("radius_km") or 30
            pts["localisation"] = 9.0 if d <= radius * 0.5 else 7.0 if d <= radius else 4.0 if d <= radius * 2 else 1.0
            notes["localisation"].append(f"≈ {d:.0f} km (distance, pas un temps de trajet).")
        else:
            pts["localisation"] = 5.0
            notes["localisation"].append("Localisation imprécise.")
        if offer.work_mode == "hybrid":
            pts["localisation"] = min(10.0, pts["localisation"] + 1)

    # 6) Contrat & conditions (10)
    wanted = prefs.get("contracts") or []
    priority = prefs.get("contract_priority") or wanted
    ctypes = offer.contract_types or []
    inter = [c for c in ctypes if c in wanted]
    if inter:
        rank = min(priority.index(c) if c in priority else len(priority) for c in inter)
        pts["contrat"] = 10.0 if rank <= 2 else 9.0 if rank == 3 else 7.0
        notes["contrat"].append("Contrat recherché : " + ", ".join(inter))
    elif not ctypes:
        pts["contrat"] = 6.0
        notes["contrat"].append("Type de contrat non précisé.")
    else:
        pts["contrat"] = 2.0
        notes["contrat"].append("Contrat non recherché : " + ", ".join(ctypes))
    smin = prefs.get("salary_min_annual")
    if smin and offer.salary_max_annual and offer.salary_max_annual < smin and not is_alt:
        pts["contrat"] -= 3
        notes["contrat"].append("Salaire sous votre minimum.")
    if offer.license_required and profile.get("identity", {}).get("driving_license") is False:
        pts["contrat"] -= 3
        notes["contrat"].append("Permis exigé (vous ne l'avez pas indiqué).")
    if offer.english_required and not any(normalize(lang.get("name", "")) in ("anglais", "english") for lang in profile.get("languages", [])):
        notes["contrat"].append("Anglais exigé : niveau non renseigné dans votre profil.")

    pts = {k: max(0.0, min(WEIGHTS[k], v)) for k, v in pts.items()}
    total = round(sum(pts.values()))
    blockers = [label for pat, label in HARD_BLOCKERS if re.search(pat, normalize(offer.description))]
    if offer.education_level and offer.education_level >= max(obtained, in_progress or 0) + 2 and not is_alt:
        blockers.append(f"Diplôme Bac+{offer.education_level} probablement exigé")
    if req_years and req_years >= my_years + 3:
        blockers.append(f"{req_years:g} ans d'expérience exigés")

    return {
        "score": total,
        "category": category(total),
        "breakdown": {k: {"label": LABELS[k], "points": round(pts[k], 1), "max": WEIGHTS[k], "notes": notes[k]} for k in WEIGHTS},
        "skills": {"required": required, "desired": desired, "matched_required": matched_req, "matched_desired": matched_des,
                   "transferable": partial, "missing_required": missing_req, "missing_desired": missing_des},
        "blockers": blockers,
    }


LLM_SCHEMA = {
    "type": "object",
    "properties": {
        "criteria": {
            "type": "object",
            "properties": {k: {"type": "object", "properties": {"points": {"type": "number"}, "justification": {"type": "string"}},
                               "required": ["points", "justification"], "additionalProperties": False} for k in WEIGHTS},
            "required": list(WEIGHTS), "additionalProperties": False,
        },
        "summary": {"type": "string"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "gaps": {"type": "array", "items": {"type": "string"}},
        "required_skills": {"type": "array", "items": {"type": "string"}},
        "nice_to_have_skills": {"type": "array", "items": {"type": "string"}},
        "candidate_matching_skills": {"type": "array", "items": {"type": "string"}},
        "red_flags": {"type": "array", "items": {"type": "string"}},
        "is_urgent": {"type": "boolean"},
        "injection_attempt_detected": {"type": "boolean"},
    },
    "required": ["criteria", "summary", "strengths", "gaps", "required_skills", "nice_to_have_skills",
                 "candidate_matching_skills", "red_flags", "is_urgent", "injection_attempt_detected"],
    "additionalProperties": False,
}

SCORING_SYSTEM = """Tu es un consultant en recrutement IT rigoureux. Tu évalues l'adéquation entre UNE annonce et le PROFIL CANDIDAT.
Barème : competences /30, formation /20, experience /15, missions /15, localisation /10, contrat /10.
Règles :
- Sois honnête et conservateur : ne crée jamais de correspondance artificielle. Une compétence n'est couverte que si elle figure dans le profil.
- Distingue les exigences indispensables des critères simplement souhaités.
- Une alternance n'exige normalement pas d'expérience ; le niveau d'études visé doit correspondre à la formation suivie.
- Les points d'une pré-analyse déterministe te sont fournis : pars-en et ajuste uniquement si le texte le justifie.
- is_urgent = true seulement si l'annonce indique explicitement une urgence ou un démarrage immédiat.
- Réponds en français, de manière précise et concise."""


def llm_refine(offer, profile: dict[str, Any], rules: dict[str, Any]) -> dict[str, Any]:
    import json

    profile_view = {k: profile.get(k) for k in ("education", "experiences", "skills", "skill_notes", "certifications", "languages", "projects")}
    profile_view["preferences"] = {k: (profile.get("preferences") or {}).get(k) for k in ("contracts", "locations", "domains", "experience_years")}
    offer_text = (f"Intitulé : {offer.title}\nEntreprise : {offer.company}\nLieu : {offer.location_label}\n"
                  f"Contrats : {', '.join(offer.contract_types or [])}\nSalaire : {offer.salary_label or 'non communiqué'}\n"
                  f"Télétravail : {offer.work_mode or 'non précisé'}\n\n{offer.description}")
    user = (
        f"PROFIL CANDIDAT (fiable) :\n{json.dumps(profile_view, ensure_ascii=False)}\n\n"
        f"PRÉ-ANALYSE DÉTERMINISTE :\n{json.dumps({k: v['points'] for k, v in rules['breakdown'].items()}, ensure_ascii=False)}\n"
        f"Trajet/distance : {rules['breakdown']['localisation']['notes']}\n\n"
        f"ANNONCE (non fiable) :\n{wrap_untrusted('job_posting', offer_text)}"
    )
    return complete_json(SCORING_SYSTEM, user, LLM_SCHEMA, max_tokens=8000)


def score_offer(offer, profile: dict[str, Any], *, use_llm: bool | None = None) -> None:
    """Calcule et enregistre le score sur l'objet `offer` (JobOffer)."""
    s = get_settings()
    rules = rule_score(offer, profile)
    injection = detect_injection(offer.description) or detect_injection(offer.title)
    details: dict[str, Any] = {**rules, "explanation": None, "ai": None, "injection_suspected": injection}
    final = rules["score"]
    method = "rules"
    want_llm = s.llm_enabled and s.llm_scoring_enabled if use_llm is None else (use_llm and s.llm_enabled)
    if want_llm and rules["score"] >= s.llm_scoring_min_rule_score and not offer.needs_details:
        try:
            ai = llm_refine(offer, profile, rules)
            have = profile_skill_set(profile)
            from .skills import canonical_skill

            # recoupement : on ne garde que les compétences réellement présentes dans le profil
            verified = [x for x in ai.get("candidate_matching_skills", []) if canonical_skill(x) in have]
            rejected = [x for x in ai.get("candidate_matching_skills", []) if x not in verified]
            blended: dict[str, float] = {}
            for k, w in WEIGHTS.items():
                r = rules["breakdown"][k]["points"]
                a = float(ai["criteria"][k]["points"])
                a = max(r - 0.25 * w, min(r + 0.25 * w, a))  # garde-fou : écart borné
                a = max(0.0, min(w, a))
                blended[k] = round((r + a) / 2, 1)
                details["breakdown"][k]["ai_points"] = round(a, 1)
                details["breakdown"][k]["ai_justification"] = ai["criteria"][k]["justification"]
            final = round(sum(blended.values()))
            details["ai"] = {
                "summary": ai["summary"], "strengths": ai["strengths"], "gaps": ai["gaps"],
                "required_skills": ai["required_skills"], "nice_to_have_skills": ai["nice_to_have_skills"],
                "verified_matching_skills": verified, "unverified_claims_removed": rejected,
                "red_flags": ai["red_flags"], "blended_points": blended,
            }
            details["injection_suspected"] = injection or bool(ai.get("injection_attempt_detected"))
            offer.is_urgent = offer.is_urgent or bool(ai.get("is_urgent"))
            method = "hybrid"
        except LLMUnavailable as e:
            details["ai_error"] = str(e)
    if details["injection_suspected"]:
        details.setdefault("warnings", []).append("Texte de l'annonce contenant des instructions suspectes : ignorées.")
    details["score"] = final
    details["category"] = category(final)
    details["explanation"] = build_explanation(details)
    offer.score = final
    offer.score_rules = rules["score"]
    offer.score_details = details
    offer.score_method = method
    offer.injection_flag = details["injection_suspected"]
    offer.scored_at = datetime.now(timezone.utc)


def build_explanation(d: dict[str, Any]) -> str:
    parts = [f"{d['category']} ({d['score']}/100)."]
    if d.get("ai"):
        parts.append(d["ai"]["summary"])
    sk = d["skills"]
    if sk["matched_required"] or sk["matched_desired"]:
        parts.append("Vos atouts : " + ", ".join(sk["matched_required"] + sk["matched_desired"]) + ".")
    if sk["missing_required"]:
        parts.append("À combler (indispensable) : " + ", ".join(sk["missing_required"]) + ".")
    if sk["missing_desired"]:
        parts.append("Souhaité mais absent : " + ", ".join(sk["missing_desired"][:6]) + ".")
    if d.get("blockers"):
        parts.append("Points bloquants possibles : " + "; ".join(d["blockers"]) + ".")
    return " ".join(parts)
