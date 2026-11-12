"""Normalisation des annonces brutes : contrat, salaire, niveau d'études, expérience, mode de travail…"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any

from .skills import normalize

CONTRACTS = ["alternance", "apprentissage", "professionnalisation", "cdi", "cdd", "stage", "interim", "freelance"]
CONTRACT_LABELS = {
    "alternance": "Alternance", "apprentissage": "Apprentissage", "professionnalisation": "Contrat de professionnalisation",
    "cdi": "CDI", "cdd": "CDD", "stage": "Stage", "interim": "Intérim", "freelance": "Freelance",
}


@dataclass
class RawJob:
    """Format pivot produit par chaque connecteur."""

    source: str
    external_id: str
    title: str
    company: str = ""
    description: str = ""
    url: str | None = None
    location_label: str = ""
    city: str | None = None
    postal_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    contract_hint: str = ""
    salary_text: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_period: str | None = None  # year | month | hour
    salary_is_estimated: bool = False
    published_at: datetime | None = None
    expires_at: datetime | None = None
    remote_hint: str | None = None
    education_hint: str | None = None
    experience_hint: str | None = None
    skills_required: list[str] = field(default_factory=list)
    skills_desired: list[str] = field(default_factory=list)
    license_required: bool | None = None
    english_required: bool | None = None
    company_size_hint: str | None = None
    is_closed: bool = False
    needs_details: bool = False
    raw: dict[str, Any] = field(default_factory=dict)


def parse_contracts(*texts: str | None) -> list[str]:
    n = normalize(" ".join(t for t in texts if t))
    out: list[str] = []
    if re.search(r"apprenti", n):
        out.append("apprentissage")
    if re.search(r"professionnalisation|contrat pro\b", n):
        out.append("professionnalisation")
    if re.search(r"alternan|work[- ]study|apprenti|professionnalisation", n):
        out.append("alternance")
    if re.search(r"\bcdi\b|duree indeterminee|permanent|full[- ]time permanent", n):
        out.append("cdi")
    if re.search(r"\bcdd\b|duree determinee|fixed[- ]term|temporary contract", n):
        out.append("cdd")
    if re.search(r"\bstage\b|stagiaire|internship|\bintern\b", n):
        out.append("stage")
    if re.search(r"interim|\bmis\b", n):
        out.append("interim")
    if re.search(r"freelance|independant", n):
        out.append("freelance")
    return list(dict.fromkeys(out))


_NUM = r"(\d+(?:[ \u202f]\d{3})*(?:[\.,]\d+)*)\s*(k\b|k€)?"


def _to_float(s: str, k: str | None) -> float:
    s = s.replace(" ", "").replace("\u202f", "")
    # '35.000' / '35,000' = séparateur de milliers ; '1800.00' / '12,50' = décimales
    if re.fullmatch(r"\d{1,3}([.,]\d{3})+", s):
        s = re.sub(r"[.,]", "", s)
    else:
        s = s.replace(",", ".")
        if s.count(".") > 1:
            head, _, tail = s.rpartition(".")
            s = head.replace(".", "") + "." + tail
    v = float(s)
    return v * 1000 if k else v


def parse_salary(text: str | None) -> tuple[float | None, float | None, str | None]:
    """Retourne (min, max, période). Gère '35-40 k€', 'Annuel de 32000 à 38000 Euros', '1800 € / mois'."""
    if not text:
        return None, None, None
    n = normalize(text)
    nums = [(_to_float(m.group(1), m.group(2)), m) for m in re.finditer(_NUM, n)]
    nums = [x for x in nums if x[0] >= 7 or re.search(r"\d\s*k\b|k€", n)]  # ignore '12 mois', '13e mois' faible valeur
    if not nums:
        return None, None, None
    vals = [v for v, _ in nums]
    if any(m.group(2) for _, m in nums):  # '35-40 k€' : le suffixe k s'applique à toute la fourchette
        vals = [v * 1000 if v < 1000 else v for v in vals]
    if "mensuel" in n or "/ mois" in n or "par mois" in n or "/mois" in n or "month" in n:
        period = "month"
    elif "horaire" in n or "/ h" in n or "heure" in n or "hour" in n:
        period = "hour"
    else:
        period = "year" if max(vals) > 5000 else "month"
    # 'sur 12 mois' : on enlève les petites valeurs parasites
    vals = [v for v in vals if not (period != "hour" and v < 100)]
    if not vals:
        return None, None, None
    return min(vals), max(vals), period


def annualize(v: float | None, period: str | None) -> float | None:
    if v is None:
        return None
    if period == "month":
        return round(v * 12)
    if period == "hour":
        return round(v * 151.67 * 12)
    return round(v)


NET_RATIO = 0.78  # estimation brut -> net (secteur privé, non-cadre). Valeur indicative.


def monthly_net_estimate(annual_gross: float | None) -> int | None:
    return None if annual_gross is None else round(annual_gross / 12 * NET_RATIO)


def parse_education(text: str | None) -> int | None:
    n = normalize(text)
    if not n:
        return None
    levels = []
    for m in re.finditer(r"bac ?\+ ?(\d)", n):
        levels.append(int(m.group(1)))
    if re.search(r"\bmaster\b|ingenieur diplome|ecole d.ingenieur|\bmsc\b|niveau 7", n):
        levels.append(5)
    if re.search(r"\bbachelor\b|licence|\bbut\b|niveau 6", n):
        levels.append(3)
    if re.search(r"\bbts\b|\bdut\b|niveau 5\b", n):
        levels.append(2)
    levels = [lv for lv in levels if 0 < lv <= 8]
    return min(levels) if levels else None


def parse_experience(text: str | None) -> tuple[float | None, bool | None]:
    """Retourne (années minimum, débutant accepté)."""
    n = normalize(text)
    if not n:
        return None, None
    beginner = bool(re.search(r"debutant(e)?s? (accepte|bienvenu)|sans experience|premiere experience|jeune diplome|junior|entry[- ]level|graduate", n))
    years = None
    m = re.search(r"(\d{1,2})\s*(?:\+|a \d{1,2}|-\d{1,2})?\s*(?:ans?|annees?|years?)\s*(?:d.|of)?\s*(?:experience|exp)", n)
    if m:
        years = float(m.group(1))
    elif re.search(r"\bsenior\b|confirme|expert", n):
        years = 5.0
    if years is not None and years <= 1:
        beginner = True
    return years, beginner


def parse_work_mode(*texts: str | None) -> str | None:
    n = normalize(" ".join(t for t in texts if t))
    if re.search(r"full remote|100 ?% (teletravail|remote)|teletravail (total|complet)|fully remote", n):
        return "remote"
    if re.search(r"hybride|hybrid|teletravail|remote partiel|\d ?jours? (de )?(teletravail|remote)", n):
        return "hybrid"
    if re.search(r"sur site|on[- ]site|presentiel", n):
        return "onsite"
    return None


def parse_license(text: str | None) -> bool | None:
    n = normalize(text)
    if re.search(r"permis b (obligatoire|exige|indispensable|requis)|permis (de conduire )?(obligatoire|exige|indispensable)|vehicule(e)? obligatoire", n):
        return True
    return None


def parse_english(text: str | None) -> bool | None:
    n = normalize(text)
    if re.search(r"anglais (courant|bilingue|professionnel|obligatoire|indispensable|exige|requis|operationnel)|fluent (in )?english|english (is )?(required|mandatory)|bilingue", n):
        return True
    if re.search(r"anglais (technique|lu|apprecie|souhaite|un plus)", n):
        return False
    return None


def parse_start_date(text: str | None) -> date | None:
    n = normalize(text)
    m = re.search(r"(debut|demarrage|start|prise de poste)[^\d]{0,30}(\d{1,2})[/\.-](\d{1,2})[/\.-](\d{2,4})", n)
    if m:
        d, mo, y = int(m.group(2)), int(m.group(3)), int(m.group(4))
        y = y + 2000 if y < 100 else y
        try:
            return date(y, mo, d)
        except ValueError:
            return None
    months = {"janvier": 1, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6, "juillet": 7, "aout": 8,
              "septembre": 9, "octobre": 10, "novembre": 11, "decembre": 12}
    m = re.search(r"(debut|demarrage|rentree|des|a partir de)[^\.]{0,20}\b(" + "|".join(months) + r")\b\s*(\d{4})?", n)
    if m:
        y = int(m.group(3)) if m.group(3) else datetime.now(timezone.utc).year
        return date(y, months[m.group(2)], 1)
    return None


# --- Typologie d'entreprise ---------------------------------------------------------------
ESN = ["capgemini", "sopra steria", "atos", "eviden", "cgi", "accenture", "alten", "akkodis", "inetum", "devoteam",
       "wavestone", "sii", "expleo", "altran", "davidson", "onepoint", "alter solutions", "neurones", "econocom",
       "ausy", "extia", "spie ics", "scc", "computacenter", "infeeny", "magellan", "ippon", "talan", "aubay", "niji",
       "modis", "apside", "astek", "open groupe", "groupe open", "sogeti", "ibm", "nttdata", "ntt data", "axians", "bechtle",
       "orange business", "kyndryl", "dxc", "tcs", "infosys", "wipro", "hcl", "cognizant", "inop", "umanis", "keyrus"]
BIG_GROUPS = ["airbus", "safran", "thales", "dassault", "bnp", "societe generale", "credit agricole", "axa", "allianz",
              "orange", "sncf", "ratp", "edf", "engie", "totalenergies", "air france", "groupe adp", "aeroports de paris",
              "fedex", "la poste", "renault", "stellantis", "lvmh", "l'oreal", "loreal", "bouygues", "vinci", "saint-gobain",
              "michelin", "schneider", "natixis", "bpce", "lcl", "credit mutuel", "generali", "macif", "maif", "groupama",
              "covea", "ag2r", "malakoff", "sanofi", "carrefour", "auchan", "decathlon", "veolia", "suez", "alstom",
              "valeo", "faurecia", "forvia", "nexans", "legrand", "danone", "pernod", "kering", "hermes", "accor",
              "sodexo", "publicis", "mbda", "naval group", "arianegroup", "ariane group", "microsoft", "google", "amazon",
              "aws", "ovhcloud", "ovh", "free", "iliad", "sfr", "bouygues telecom", "canal+", "tf1", "france televisions",
              "amundi", "hsbc", "boursorama", "caisse des depots", "banque de france", "bpifrance", "dhl", "ups", "geodis",
              "air liquide", "arkema", "eiffage", "spie", "egis", "assystem", "worldline", "ingenico"]
PUBLIC = ["ministere", "mairie", "ville de", "region ", "conseil departemental", "conseil regional", "departement de",
          "prefecture", "hopital", "ap-hp", "aphp", "chu ", "centre hospitalier", "universite", "cnrs", "inria", "cea",
          "fonction publique", "collectivite", "communaute d.agglomeration", "agglomeration", "metropole", "france travail",
          "pole emploi", "urssaf", "caf ", "cpam", "assurance maladie", "education nationale", "rectorat", "armee",
          "gendarmerie", "police nationale", "dgfip", "insee", "etablissement public", "sdis", "anssi", "dinum"]


def classify_company(name: str, description: str = "", size_hint: str | None = None) -> tuple[str | None, str]:
    """Retourne (type, secteur) — type ∈ {esn, grand_groupe, public, pme, None}, secteur ∈ {public, prive}."""
    n = normalize(name)
    d = normalize(description[:2000])
    if any(p in n for p in PUBLIC) or re.search(r"fonction publique|titulaire ou contractuel|poste de catégorie|categorie [abc]\b", d):
        return "public", "public"
    if any(re.search(r"\b" + re.escape(e) + r"\b", n) for e in ESN) or re.search(r"\besn\b|entreprise de services du numerique|\bssii\b", d[:600]):
        return "esn", "prive"
    if any(re.search(r"\b" + re.escape(b) + r"\b", n) for b in BIG_GROUPS):
        return "grand_groupe", "prive"
    if size_hint:
        s = normalize(size_hint)
        m = re.search(r"(\d+)", s)
        if "5000" in s or "2000" in s or "1000" in s or (m and int(m.group(1)) >= 1000):
            return "grand_groupe", "prive"
        if m and int(m.group(1)) < 250:
            return "pme", "prive"
    return None, "prive"


# Coordonnées des localisations prédéfinies (centre-ville) — pas d'appel réseau nécessaire
PRESET_LOCATIONS: dict[str, tuple[float, float]] = {
    "Paris": (48.8566, 2.3522),
    "Île-de-France": (48.8499, 2.6370),
    "Oise": (49.4120, 2.4103),
    "Creil": (49.2600, 2.4740),
    "Chantilly": (49.1940, 2.4710),
    "Senlis": (49.2070, 2.5860),
    "Compiègne": (49.4179, 2.8261),
    "Roissy-en-France": (49.0040, 2.5170),
    "Saint-Denis": (48.9362, 2.3574),
    "La Défense": (48.8918, 2.2380),
    "Boulogne-Billancourt": (48.8397, 2.2399),
    "Nanterre": (48.8924, 2.2069),
    "Versailles": (48.8049, 2.1204),
}
# départements pour la recherche par zone (France Travail)
PRESET_DEPARTMENTS = {"Paris": ["75"], "Île-de-France": ["75", "77", "78", "91", "92", "93", "94", "95"], "Oise": ["60"]}
