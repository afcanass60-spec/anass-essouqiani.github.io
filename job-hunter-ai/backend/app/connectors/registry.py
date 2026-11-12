"""Registre des sources + statut honnête de chaque plateforme demandée."""
from __future__ import annotations

from .adzuna import AdzunaConnector
from .base import Connector
from .france_travail import FranceTravailConnector
from .la_bonne_alternance import LaBonneAlternanceConnector
from .others import EmailAlertsConnector, GoogleCareersConnector

CONNECTORS: dict[str, Connector] = {c.key: c for c in [
    FranceTravailConnector(), LaBonneAlternanceConnector(), AdzunaConnector(), GoogleCareersConnector(), EmailAlertsConnector(),
]}

# Plateformes sans API publique de recherche : collecte automatisée NON réalisée (CGU / anti-bot).
UNSUPPORTED = [
    {"key": "linkedin", "label": "LinkedIn Jobs", "reason": "Pas d'API publique de recherche d'offres ; le scraping est interdit par les CGU.",
     "alternative": "Créer des alertes LinkedIn → connecteur « Alertes email ». Import manuel par copier-coller."},
    {"key": "indeed", "label": "Indeed", "reason": "L'API de recherche publique (Publisher) est fermée ; scraping interdit par les CGU.",
     "alternative": "Alertes email Indeed → connecteur « Alertes email ». Beaucoup d'offres Indeed figurent aussi chez France Travail / Adzuna."},
    {"key": "welcome_to_the_jungle", "label": "Welcome to the Jungle", "reason": "Pas d'API publique pour les candidats.",
     "alternative": "Alertes email WTTJ. Les entreprises utilisant Welcome Kit/Lever/Greenhouse peuvent être suivies via « Entreprises »."},
    {"key": "apec", "label": "Apec", "reason": "Pas d'API publique d'offres pour les particuliers.",
     "alternative": "Alertes email Apec → connecteur « Alertes email »."},
    {"key": "hellowork", "label": "HelloWork", "reason": "Pas d'API publique ; collecte automatisée non autorisée.",
     "alternative": "Alertes email HelloWork. Offres souvent relayées par France Travail."},
    {"key": "jobteaser", "label": "JobTeaser", "reason": "Plateforme réservée aux étudiants des écoles partenaires (authentification).",
     "alternative": "Alertes email JobTeaser (via le compte ESGI) → connecteur « Alertes email »."},
    {"key": "meteojob", "label": "Meteojob", "reason": "Pas d'API publique.", "alternative": "Alertes email Meteojob."},
    {"key": "chooseyourboss", "label": "ChooseYourBoss", "reason": "Pas d'API publique.", "alternative": "Alertes email ChooseYourBoss."},
    {"key": "workday", "label": "Sites carrières Workday", "reason": "Pas d'API publique documentée pour les candidats.",
     "alternative": "Suivi de la page carrière (détection de changements) + import manuel."},
]

ATS_SOURCES = [
    {"key": k, "label": label, "kind": "ats", "official": True, "configured": True, "required_env": [],
     "supported": True, "docs_url": d, "notes": "API publique de l'ATS — utilisée via la page « Entreprises » (suivi des pages carrières)."}
    for k, label, d in [
        ("greenhouse", "Greenhouse", "https://developers.greenhouse.io/job-board.html"),
        ("lever", "Lever", "https://github.com/lever/postings-api"),
        ("smartrecruiters", "SmartRecruiters", "https://developers.smartrecruiters.com/docs/posting-api"),
        ("recruitee", "Recruitee", "https://docs.recruitee.com/reference/offers"),
        ("ashby", "Ashby", "https://developers.ashbyhq.com/docs/public-job-posting-api"),
        ("career_page", "Pages carrières (schema.org JobPosting)", "https://schema.org/JobPosting"),
    ]
]


def sources_status() -> list[dict]:
    out = [c.describe() for c in CONNECTORS.values()] + ATS_SOURCES
    out += [{**u, "kind": "unsupported", "official": False, "configured": False, "supported": False, "required_env": []} for u in UNSUPPORTED]
    return out
