"""Profil centralisé : valeurs initiales (issues du brief) + helpers.

Règle : on ne remplit QUE ce qui a été fourni. Les éléments inconnus sont laissés vides
et marqués `to_complete` pour que l'utilisateur les renseigne lui-même.
"""
from __future__ import annotations

import copy
import uuid
from typing import Any

from .skills import canonical_skill

INITIAL_PROFILE: dict[str, Any] = {
    "identity": {
        "full_name": "", "headline": "Étudiant Bachelor Systèmes, Réseaux & Cloud — recherche alternance",
        "email": "", "phone": "", "city": "", "linkedin": "", "website": "", "driving_license": None,
    },
    "summary": "",
    "education": [
        {"id": "edu-esgi", "degree": "Bachelor Systèmes, Réseaux & Cloud (3e année)", "school": "ESGI Paris",
         "start": "", "end": "", "status": "in_progress", "level": 3, "grade": "",
         "details": "Formation orientée systèmes informatiques, infrastructures, réseaux et cloud."},
        {"id": "edu-bts", "degree": "BTS SIO (Services Informatiques aux Organisations)", "school": "",
         "start": "", "end": "", "status": "obtained", "level": 2, "grade": "13,72/20", "details": ""},
    ],
    "experiences": [
        {"id": "exp-fedex", "title": "", "company": "FedEx", "location": "", "start": "", "end": "", "current": False,
         "description": "Expérience en environnement informatique, notamment sur des sujets d'infrastructure informatique ; support et environnement technique d'entreprise.",
         "achievements": [], "skills": ["Support utilisateurs"], "to_complete": True},
    ],
    "skills": [
        {"name": n, "category": c} for n, c in [
            ("Windows Server", "systemes"), ("Active Directory", "systemes"), ("DNS", "systemes"), ("DHCP", "systemes"),
            ("Linux", "systemes"), ("Réseaux TCP/IP", "reseaux"), ("VLAN", "reseaux"), ("802.1X", "reseaux"), ("DMZ", "reseaux"),
            ("Microsoft Azure", "cloud"), ("Microsoft 365", "cloud"), ("Cloud Computing", "cloud"), ("DevOps", "devops"),
            ("CI/CD", "devops"), ("ITIL", "methodes"), ("GLPI", "outils"), ("Cybersécurité", "securite"),
            ("Audit de sécurité", "securite"), ("Virtualisation", "virtualisation"), ("VirtualBox", "virtualisation"),
            ("Proxmox", "virtualisation"), ("Support utilisateurs", "support"),
        ]
    ],
    "skill_notes": {"Windows Server": "Windows Server 2022", "Audit de sécurité": "Audit informatique (notions)",
                    "Gestion de projet": "Notions de gestion des infrastructures"},
    "certifications": [],
    "languages": [],
    "projects": [],
    "interests": [],
    "preferences": {
        "contracts": ["alternance", "apprentissage", "professionnalisation", "cdi", "cdd"],
        "contract_priority": ["alternance", "apprentissage", "professionnalisation", "cdi", "cdd"],
        "locations": ["Paris", "Île-de-France", "Oise"],
        "radius_km": 30,
        "home": {"label": "", "lat": None, "lon": None},
        "travel_mode": "transit",
        "max_travel_minutes": 60,
        "domains": ["admin_sys_reseau", "infrastructure", "cloud", "devops", "cyber", "support_n2", "m365", "projet_it", "data_ia"],
        "salary_min_annual": None,
        "work_modes": ["onsite", "hybrid", "remote"],
        "experience_years": None,
        "available_from": "",
        "rhythm": "",
    },
}


def initial_profile() -> dict[str, Any]:
    return copy.deepcopy(INITIAL_PROFILE)


def ensure_ids(data: dict[str, Any]) -> dict[str, Any]:
    for key in ("education", "experiences", "certifications", "projects"):
        for item in data.get(key, []) or []:
            if not item.get("id"):
                item["id"] = f"{key[:3]}-{uuid.uuid4().hex[:8]}"
    return data


def profile_skill_set(data: dict[str, Any]) -> set[str]:
    """Compétences canoniques réellement présentes dans le profil (compétences + expériences + projets)."""
    out: set[str] = set()
    names = [s.get("name", "") for s in data.get("skills", [])]
    for e in data.get("experiences", []) + data.get("projects", []):
        names += e.get("skills", []) or []
    for c in data.get("certifications", []):
        names.append(c.get("name", ""))
    for lang in data.get("languages", []):
        names.append(lang.get("name", ""))
    for n in names:
        c = canonical_skill(n) if n else None
        if c:
            out.add(c)
    return out


def education_levels(data: dict[str, Any]) -> tuple[int, int | None]:
    """(niveau obtenu le plus élevé, niveau en cours le plus élevé)."""
    obtained = max([e.get("level") or 0 for e in data.get("education", []) if e.get("status") == "obtained"] or [0])
    in_prog = [e.get("level") or 0 for e in data.get("education", []) if e.get("status") == "in_progress"]
    return obtained, (max(in_prog) if in_prog else None)


def experience_years(data: dict[str, Any]) -> float:
    v = (data.get("preferences") or {}).get("experience_years")
    return float(v) if v not in (None, "") else 0.5
