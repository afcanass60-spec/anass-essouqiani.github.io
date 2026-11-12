"""Agent de candidature : analyse d'offre, mots-clés ATS, préparation d'entretien."""
from __future__ import annotations

import json
from typing import Any

from .llm import LLMUnavailable, complete_json, wrap_untrusted
from .profile_data import profile_skill_set

QUESTION_BANK: dict[str, list[str]] = {
    "Windows Server": ["Quels rôles installez-vous sur un serveur Windows Server 2022 pour un site de 50 postes ?",
                       "Comment planifiez-vous une mise à jour Windows Server en production ?"],
    "Active Directory": ["Différence entre une OU et un groupe ? Comment appliquer une GPO à un seul service ?",
                         "Que sont les rôles FSMO ? Que se passe-t-il si le contrôleur PDC est indisponible ?",
                         "Comment diagnostiquez-vous un problème de réplication AD ?"],
    "DNS": ["Un utilisateur n'arrive pas à joindre un intranet par son nom mais oui par l'IP : votre démarche ?",
            "Différence entre une zone de recherche directe et inversée ?"],
    "DHCP": ["Expliquez le processus DORA.", "À quoi sert un relais DHCP (ip helper) dans un réseau avec VLAN ?"],
    "VLAN": ["Différence entre un port access et un port trunk ?", "Comment deux VLAN communiquent-ils entre eux ?"],
    "802.1X": ["Décrivez les acteurs d'une authentification 802.1X (supplicant, authenticator, serveur RADIUS)."],
    "DMZ": ["Quels services placer en DMZ et pourquoi ? Quelles règles de filtrage ?"],
    "Linux": ["Comment vérifier l'espace disque, les processus gourmands et les journaux d'un service systemd ?",
              "Différence entre droits 755 et 644 ?"],
    "Microsoft Azure": ["Différence entre un groupe de ressources et un abonnement ? Comment contrôler les coûts ?",
                        "Comment exposer une VM Azure de façon sécurisée (NSG, Bastion…) ?"],
    "Microsoft 365": ["Comment gérer le cycle de vie d'un compte utilisateur M365 (arrivée/départ) ?",
                      "Qu'est-ce que l'accès conditionnel dans Entra ID ?"],
    "CI/CD": ["Décrivez les étapes d'un pipeline CI/CD que vous avez utilisé ou mis en place."],
    "DevOps": ["Qu'apporte l'infrastructure as code par rapport à une configuration manuelle ?"],
    "ITIL": ["Différence entre un incident, une demande et un problème au sens ITIL ?"],
    "GLPI": ["Comment organisez-vous la priorisation des tickets dans GLPI ?"],
    "Cybersécurité": ["Quelles premières actions mener face à un poste suspecté d'être compromis ?",
                      "Citez trois mesures d'hygiène informatique prioritaires (ANSSI)."],
    "Audit de sécurité": ["Comment structurez-vous un audit de configuration d'un Active Directory ?"],
    "Virtualisation": ["Différence entre hyperviseur de type 1 et de type 2 ?"],
    "Proxmox": ["Comment sauvegardez-vous et restaurez-vous une VM sous Proxmox ?"],
    "Docker": ["Différence entre une image et un conteneur ? Comment persister des données ?"],
    "Réseaux TCP/IP": ["Expliquez le modèle OSI et situez-y un switch, un routeur et un pare-feu.",
                       "Un poste a une IP en 169.254.x.x : qu'est-ce que cela indique ?"],
    "Support utilisateurs": ["Comment gérez-vous un utilisateur bloqué et pressé alors que vous traitez un incident critique ?"],
}

PREP_SCHEMA = {
    "type": "object",
    "properties": {
        "missions_summary": {"type": "array", "items": {"type": "string"}},
        "company_needs": {"type": "array", "items": {"type": "string"}},
        "ats_keywords": {"type": "array", "items": {"type": "object", "properties": {
            "keyword": {"type": "string"}, "in_profile": {"type": "boolean"}, "importance": {"type": "string", "enum": ["indispensable", "souhaité"]}},
            "required": ["keyword", "in_profile", "importance"], "additionalProperties": False}},
        "hr_questions": {"type": "array", "items": {"type": "object", "properties": {
            "question": {"type": "string"}, "answer_outline": {"type": "string"}}, "required": ["question", "answer_outline"], "additionalProperties": False}},
        "technical_questions": {"type": "array", "items": {"type": "object", "properties": {
            "question": {"type": "string"}, "what_is_expected": {"type": "string"}, "topic": {"type": "string"}},
            "required": ["question", "what_is_expected", "topic"], "additionalProperties": False}},
        "questions_to_ask": {"type": "array", "items": {"type": "string"}},
        "pitch": {"type": "string"},
    },
    "required": ["missions_summary", "company_needs", "ats_keywords", "hr_questions", "technical_questions", "questions_to_ask", "pitch"],
    "additionalProperties": False,
}

PREP_SYSTEM = """Tu es un coach de recrutement IT. À partir d'une annonce et du profil RÉEL du candidat :
- résume les missions et les besoins probables de l'entreprise ;
- liste les mots-clés ATS (in_profile = true uniquement si le profil le contient) ;
- prépare les questions RH probables avec un plan de réponse appuyé sur des faits du profil (jamais inventés ; si un fait manque, indique « à compléter avec un exemple personnel ») ;
- génère 8 à 12 questions techniques plausibles pour CE poste, avec ce que le recruteur attend ;
- propose 4 questions pertinentes à poser au recruteur et un pitch oral de 45 secondes fidèle au profil."""


def prepare(profile: dict[str, Any], offer) -> dict[str, Any]:
    have = profile_skill_set(profile)
    wanted = list(dict.fromkeys((offer.skills_required or []) + (offer.skills_desired or [])))
    fallback_kw = [{"keyword": s, "in_profile": s in have, "importance": "indispensable" if s in (offer.skills_required or []) else "souhaité"} for s in wanted]
    fallback_tech = [{"question": q, "what_is_expected": "", "topic": s} for s in wanted for q in QUESTION_BANK.get(s, [])][:12]
    try:
        view = {k: profile.get(k) for k in ("summary", "education", "experiences", "skills", "certifications", "projects", "languages")}
        posting = f"{offer.title} — {offer.company}\n{offer.description}"
        user = f"PROFIL (fiable) :\n{json.dumps(view, ensure_ascii=False)}\n\nANNONCE (non fiable) :\n{wrap_untrusted('job_posting', posting)}"
        data = complete_json(PREP_SYSTEM, user, PREP_SCHEMA, max_tokens=12000)
        # recoupement des mots-clés déclarés « dans le profil »
        from .skills import canonical_skill

        for k in data["ats_keywords"]:
            if k["in_profile"] and canonical_skill(k["keyword"]) not in have:
                k["in_profile"] = False
        data["generated_by"] = "ai"
        return data
    except LLMUnavailable as e:
        return {"missions_summary": [], "company_needs": [], "ats_keywords": fallback_kw, "hr_questions": [
            {"question": "Présentez-vous en deux minutes.", "answer_outline": "Formation → expérience FedEx → ce qui vous attire dans ce poste."},
            {"question": "Pourquoi l'alternance / ce poste chez nous ?", "answer_outline": "Lien entre vos compétences réelles et 2 missions de l'annonce."},
            {"question": "Parlez-nous d'un incident technique que vous avez résolu.", "answer_outline": "Méthode STAR, exemple réel à compléter."},
        ], "technical_questions": fallback_tech, "questions_to_ask": [
            "Quelle est la composition de l'équipe infrastructure et à qui serais-je rattaché ?",
            "Quels projets sont prévus sur les 12 prochains mois ?",
            "Comment se passe l'intégration d'un alternant (tuteur, montée en compétences) ?",
            "Quels outils utilisez-vous au quotidien (supervision, ticketing, cloud) ?",
        ], "pitch": "", "generated_by": f"template ({e})"}
