"""Données initiales : recherches sauvegardées et entreprises cibles (aucune fausse annonce)."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..models import Company, CVVersion, SavedSearch
from .dedup import norm_company

# Entreprises cibles (secteur, type). Pages carrières à renseigner/valider par l'utilisateur :
# on ne devine pas d'URL ni d'identifiant ATS pour éviter toute donnée erronée.
TARGET_COMPANIES = [
    # Aéronautique / défense / industrie
    ("Airbus", "Aéronautique", "grand_groupe"), ("Safran", "Aéronautique", "grand_groupe"), ("Thales", "Aéronautique & défense", "grand_groupe"),
    ("Dassault Aviation", "Aéronautique", "grand_groupe"), ("Dassault Systèmes", "Logiciel", "grand_groupe"), ("MBDA", "Défense", "grand_groupe"),
    ("Groupe ADP", "Aéroportuaire", "grand_groupe"), ("Air France-KLM", "Transport aérien", "grand_groupe"), ("FedEx", "Logistique", "grand_groupe"),
    ("Schneider Electric", "Industrie", "grand_groupe"), ("Saint-Gobain", "Industrie", "grand_groupe"), ("Alstom", "Industrie", "grand_groupe"),
    ("Valeo", "Industrie", "grand_groupe"), ("Renault Group", "Industrie", "grand_groupe"), ("Stellantis", "Industrie", "grand_groupe"),
    # Banque / assurance
    ("BNP Paribas", "Banque", "grand_groupe"), ("Société Générale", "Banque", "grand_groupe"), ("Crédit Agricole", "Banque", "grand_groupe"),
    ("BPCE", "Banque", "grand_groupe"), ("Natixis", "Banque", "grand_groupe"), ("LCL", "Banque", "grand_groupe"), ("AXA", "Assurance", "grand_groupe"),
    ("Allianz France", "Assurance", "grand_groupe"), ("Generali", "Assurance", "grand_groupe"), ("Groupama", "Assurance", "grand_groupe"),
    ("Covéa", "Assurance", "grand_groupe"), ("Malakoff Humanis", "Assurance", "grand_groupe"),
    # Tech / cloud / télécoms
    ("Microsoft France", "Cloud", "grand_groupe"), ("OVHcloud", "Cloud", "grand_groupe"), ("Orange", "Télécoms", "grand_groupe"),
    ("Orange Business", "Cloud & réseaux", "esn"), ("Bouygues Telecom", "Télécoms", "grand_groupe"), ("SFR", "Télécoms", "grand_groupe"),
    ("Iliad (Free)", "Télécoms", "grand_groupe"), ("Scaleway", "Cloud", "pme"), ("Outscale", "Cloud", "pme"),
    # ESN
    ("Capgemini", "ESN", "esn"), ("Sopra Steria", "ESN", "esn"), ("Atos", "ESN", "esn"), ("CGI", "ESN", "esn"), ("Accenture", "ESN", "esn"),
    ("Inetum", "ESN", "esn"), ("Devoteam", "ESN", "esn"), ("Alten", "ESN", "esn"), ("Akkodis", "ESN", "esn"), ("SII", "ESN", "esn"),
    ("Wavestone", "Conseil", "esn"), ("Neurones", "ESN", "esn"), ("SPIE ICS", "ESN", "esn"), ("Computacenter", "ESN", "esn"),
    ("Econocom", "ESN", "esn"), ("Axians", "ESN", "esn"),
    # Cybersécurité
    ("Thales Cyber Solutions", "Cybersécurité", "grand_groupe"), ("Airbus Protect", "Cybersécurité", "grand_groupe"), ("Orange Cyberdefense", "Cybersécurité", "grand_groupe"),
    ("Stormshield", "Cybersécurité", "pme"), ("Wallix", "Cybersécurité", "pme"), ("Sekoia.io", "Cybersécurité", "pme"), ("Synacktiv", "Cybersécurité", "pme"),
    # Public / transport
    ("SNCF", "Transport", "public"), ("RATP", "Transport", "public"), ("EDF", "Énergie", "grand_groupe"), ("ENGIE", "Énergie", "grand_groupe"),
    ("La Poste", "Services", "grand_groupe"), ("AP-HP", "Santé", "public"), ("Ministère des Armées", "Public", "public"),
]

DEFAULT_SEARCHES = [
    ("Alternance infra / réseaux — Île-de-France & Oise",
     ["administrateur systèmes et réseaux", "technicien systèmes et réseaux", "technicien infrastructure", "administrateur infrastructure"],
     {"contracts": ["alternance", "apprentissage", "professionnalisation"], "locations": ["Paris", "Île-de-France", "Oise"], "radius_km": 30, "published_days": 14},
     "daily"),
    ("Alternance cloud / DevOps / cyber",
     ["cloud azure", "devops", "administrateur microsoft 365", "cybersécurité", "analyste soc"],
     {"contracts": ["alternance", "apprentissage", "professionnalisation"], "locations": ["Paris", "Île-de-France"], "radius_km": 30, "published_days": 14},
     "daily"),
    ("CDI / CDD junior — support N2 & admin",
     ["technicien support niveau 2", "administrateur systèmes junior", "technicien informatique"],
     {"contracts": ["cdi", "cdd"], "locations": ["Paris", "Oise"], "radius_km": 30, "published_days": 7},
     "manual"),
]


def seed_user(db: Session, user_id: int) -> None:
    from .cv_content import cv_from_profile
    from .pipeline import get_profile

    for name, sector, ctype in TARGET_COMPANIES:
        db.add(Company(user_id=user_id, name=name, name_norm=norm_company(name), sector=sector, company_type=ctype))
    now = datetime.now(timezone.utc)
    for name, kws, params, freq in DEFAULT_SEARCHES:
        db.add(SavedSearch(user_id=user_id, name=name, keywords=kws, params=params, frequency=freq,
                           next_run_at=now if freq != "manual" else None))
    db.add(CVVersion(user_id=user_id, name="CV principal", template="infra", content=cv_from_profile(get_profile(db, user_id)), origin="manual"))
    db.commit()
