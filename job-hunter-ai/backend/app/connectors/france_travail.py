"""France Travail — API « Offres d'emploi v2 » (officielle, OAuth2 client credentials).

Inscription : https://francetravail.io (créer une application, souscrire à « Offres d'emploi v2 »).
"""
from __future__ import annotations

import time

import httpx

from ..config import get_settings
from ..services import geo
from ..services.normalize import PRESET_DEPARTMENTS, RawJob
from .base import Connector, ConnectorError, NotConfigured, SearchQuery, parse_dt

# Adresses connues du serveur d'authentification (la première qui répond est mémorisée).
TOKEN_URLS = [
    "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
    "https://francetravail.io/connexion/oauth2/access_token?realm=%2Fpartenaire",
    "https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
]
SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search"
SCOPE = "api_offresdemploiv2 o2dsoffre"


TRUSTED_AUTH_DOMAINS = ("francetravail.fr", "francetravail.io", "pole-emploi.fr")


def _trusted(url: str) -> bool:
    u = httpx.URL(url)
    return u.scheme == "https" and any(u.host == d or u.host.endswith("." + d) for d in TRUSTED_AUTH_DOMAINS)


class FranceTravailConnector(Connector):
    key = "france_travail"
    label = "France Travail"
    docs_url = "https://francetravail.io/data/api/offres-emploi"
    required_env = ("FRANCE_TRAVAIL_CLIENT_ID", "FRANCE_TRAVAIL_CLIENT_SECRET")
    notes = "API officielle. Inclut de nombreuses offres de partenaires (dont certaines de jobboards)."
    _token: tuple[str, float] | None = None
    _token_url: str | None = None

    def _get_token(self, client: httpx.Client) -> str:
        if self._token and self._token[1] > time.time() + 30:
            return self._token[0]
        s = get_settings()
        form = {"grant_type": "client_credentials", "client_id": s.france_travail_client_id.strip(),
                "client_secret": s.france_travail_client_secret.strip(), "scope": s.france_travail_scope or SCOPE}
        urls = ([s.france_travail_token_url] if s.france_travail_token_url else []) + TOKEN_URLS
        problems: list[str] = []
        data = None
        for url in dict.fromkeys(urls):
            try:
                r = client.post(url, data=form, headers={"Accept": "application/json"})
                hops = 0
                # Redirection : on renvoie la même requête POST (formulaire inclus) vers la nouvelle adresse
                while r.status_code in (301, 302, 303, 307, 308) and hops < 3 and r.headers.get("location"):
                    url = str(r.url.join(r.headers["location"]))
                    if not _trusted(url):  # la clé secrète n'est jamais renvoyée hors des domaines France Travail
                        break
                    r = client.post(url, data=form, headers={"Accept": "application/json"})
                    hops += 1
            except httpx.HTTPError as e:
                problems.append(f"{httpx.URL(url).host} injoignable ({e.__class__.__name__})")
                continue
            if r.status_code == 200 and "application/json" in r.headers.get("content-type", ""):
                data = r.json()
                FranceTravailConnector._token_url = url
                break
            detail = ""
            try:
                body = r.json()
                detail = body.get("error_description") or body.get("error") or ""
            except ValueError:
                pass
            if detail in ("invalid_scope",) or "scope" in detail.lower():
                raise ConnectorError("France Travail : votre application n'est pas abonnée à l'API « Offres d'emploi v2 » "
                                     f"(scope refusé : {detail}). Ajoutez cette API à votre application sur francetravail.io.")
            if r.status_code in (400, 401) and detail:
                raise ConnectorError(f"France Travail : identifiants refusés ({detail}). Vérifiez l'identifiant client et la clé secrète.")
            problems.append(f"{r.url.host} → HTTP {r.status_code}{' ' + detail if detail else ''}"
                            f"{' vers ' + str(httpx.URL(r.headers['location']).host) if r.headers.get('location') else ''}")
        if data is None:
            if any("secours" in pb for pb in problems):
                raise ConnectorError("Service d'authentification France Travail indisponible (page de secours / maintenance "
                                     "côté France Travail). Vos clés n'ont pas pu être vérifiées : réessayez plus tard.")
            raise ConnectorError("Authentification France Travail impossible : " + " ; ".join(problems))
        FranceTravailConnector._token = (data["access_token"], time.time() + int(data.get("expires_in", 1400)))
        return data["access_token"]

    def _geo_params(self, q: SearchQuery) -> list[dict]:
        if q.national or not q.locations:
            return [{}]
        out = []
        for loc in q.locations:
            if loc in PRESET_DEPARTMENTS and loc != "Paris":
                for dep in PRESET_DEPARTMENTS[loc]:
                    out.append({"departement": dep})
                continue
            g = geo.geocode(loc if loc != "Paris" else "75001 Paris")
            if g and g.get("citycode"):
                out.append({"commune": g["citycode"], "distance": min(q.radius_km, 100)})
            elif loc == "Paris":
                out.append({"departement": "75"})
        return out or [{}]

    def search(self, q: SearchQuery) -> list[RawJob]:
        if not self.configured():
            raise NotConfigured("Identifiants France Travail manquants")
        base: dict = {"range": f"0-{min(q.max_results_per_keyword, 150) - 1}", "sort": 1}
        if q.published_days:
            base["publieeDepuis"] = min([d for d in (1, 3, 7, 14, 31) if d >= q.published_days] or [31])
        ctypes = set(q.contracts)
        # Une requête par famille de contrat (les filtres FT se combinent en ET)
        variants: list[dict] = []
        classic = [c.upper() for c in ("cdi", "cdd") if c in ctypes]
        if classic:
            variants.append({"typeContrat": ",".join(classic)})
        if ctypes & {"alternance", "apprentissage", "professionnalisation"}:
            nature = []  # E2 = apprentissage, FS = professionnalisation
            if ctypes & {"alternance", "apprentissage"}:
                nature.append("E2")
            if ctypes & {"alternance", "professionnalisation"}:
                nature.append("FS")
            variants.append({"natureContrat": ",".join(nature)})
        if "stage" in ctypes:
            variants.append({"motsCles_suffix": "stage"})
        variants = variants or [{}]
        results: dict[str, RawJob] = {}
        with self.http() as client:
            token = self._get_token(client)
            for kw in q.keywords or [""]:
                for gp, var in ((g, v) for g in self._geo_params(q) for v in variants):
                    params = {**base, **gp, **{k: v for k, v in var.items() if k != "motsCles_suffix"}}
                    words = " ".join(x for x in [kw, var.get("motsCles_suffix", "")] if x)
                    if words:
                        params["motsCles"] = words
                    r = client.get(SEARCH_URL, params=params, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
                    if r.status_code == 204:
                        continue
                    if r.status_code not in (200, 206):
                        raise ConnectorError(f"France Travail : HTTP {r.status_code} — {r.text[:200]}")
                    for o in r.json().get("resultats", []):
                        job = self._map(o)
                        results[job.external_id] = job
        return list(results.values())

    @staticmethod
    def _map(o: dict) -> RawJob:
        lieu = o.get("lieuTravail") or {}
        label = lieu.get("libelle") or ""
        city = label.split(" - ", 1)[1] if " - " in label else label
        comps = o.get("competences") or []
        from ..services.skills import extract_skills

        req = list(dict.fromkeys(k for x in comps if x.get("exigence") == "E" for k in extract_skills(x.get("libelle", ""))))
        des = [k for k in dict.fromkeys(k for x in comps if x.get("exigence") != "E" for k in extract_skills(x.get("libelle", ""))) if k not in req]
        formations = o.get("formations") or []
        edu = " ".join(f"{f.get('niveauLibelle', '')} {f.get('domaineLibelle', '')}" for f in formations)
        langs = o.get("langues") or []
        permis = o.get("permis") or []
        origin = o.get("origineOffre") or {}
        nature = o.get("natureContrat") or ""
        contract_hint = " ".join(x for x in [o.get("typeContratLibelle", ""), o.get("typeContrat", ""), nature,
                                             "alternance" if o.get("alternance") else ""] if x)
        return RawJob(
            source="france_travail", external_id=str(o.get("id")), title=o.get("intitule", ""),
            company=(o.get("entreprise") or {}).get("nom", "") or "", description=o.get("description", "") or "",
            url=origin.get("urlOrigine") or f"https://candidat.francetravail.fr/offres/recherche/detail/{o.get('id')}",
            location_label=label, city=city.strip() or None, postal_code=lieu.get("codePostal"),
            latitude=lieu.get("latitude"), longitude=lieu.get("longitude"),
            contract_hint=contract_hint, salary_text=(o.get("salaire") or {}).get("libelle"),
            published_at=parse_dt(o.get("dateCreation")), education_hint=edu,
            experience_hint=("débutant accepté" if o.get("experienceExige") == "D" else o.get("experienceLibelle", "")),
            skills_required=req, skills_desired=des,
            license_required=any(p.get("exigence") == "E" for p in permis) or None,
            english_required=any("anglais" in (lang.get("libelle", "").lower()) and lang.get("exigence") == "E" for lang in langs) or None,
            company_size_hint=o.get("trancheEffectifEtab"), raw=o,
        )
