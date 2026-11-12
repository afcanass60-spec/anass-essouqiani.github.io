"""La Bonne Alternance — API apprentissage (État, officielle). Spécialisée alternance.

Jeton : https://api.apprentissage.beta.gouv.fr (rubrique « Offres d'emploi en alternance »).
Agrège les offres France Travail, partenaires et des offres déposées directement par les recruteurs.
"""
from __future__ import annotations

from ..config import get_settings
from ..services import geo
from ..services.normalize import PRESET_LOCATIONS, RawJob
from .base import Connector, ConnectorError, NotConfigured, SearchQuery, parse_dt

URL = "https://api.apprentissage.beta.gouv.fr/api/job/v1/search"
# Codes ROME de l'informatique (systèmes, réseaux, support, sécurité, études & développement)
ROMES = ["M1801", "M1810", "I1401", "M1802", "M1805", "M1806"]


class LaBonneAlternanceConnector(Connector):
    key = "la_bonne_alternance"
    label = "La Bonne Alternance (API apprentissage)"
    docs_url = "https://api.apprentissage.beta.gouv.fr/fr/documentation-technique"
    required_env = ("LBA_API_TOKEN",)
    notes = "API publique de l'État dédiée à l'alternance. Recherche géographique (rayon) + codes ROME informatique."

    def search(self, q: SearchQuery) -> list[RawJob]:
        if not self.configured():
            raise NotConfigured("Jeton API apprentissage manquant")
        token = get_settings().lba_api_token
        points = []
        for loc in (q.locations or ["Paris"]):
            if loc in PRESET_LOCATIONS:
                points.append(PRESET_LOCATIONS[loc])
            else:
                g = geo.geocode(loc)
                if g:
                    points.append((g["lat"], g["lon"]))
        out: dict[str, RawJob] = {}
        with self.http() as client:
            for lat, lon in points or [PRESET_LOCATIONS["Paris"]]:
                params = {"latitude": lat, "longitude": lon, "radius": min(q.radius_km, 200), "romes": ",".join(ROMES)}
                r = client.get(URL, params=params, headers={"Authorization": f"Bearer {token}"})
                if r.status_code != 200:
                    raise ConnectorError(f"API apprentissage : HTTP {r.status_code}")
                for o in r.json().get("jobs", []) or []:
                    job = self._map(o)
                    if job:
                        out[job.external_id] = job
        return list(out.values())

    @staticmethod
    def _map(o: dict) -> RawJob | None:
        ident = o.get("identifier") or {}
        wp = o.get("workplace") or {}
        offer = o.get("offer") or {}
        contract = o.get("contract") or {}
        loc = (wp.get("location") or {})
        coords = ((loc.get("geopoint") or {}).get("coordinates")) or [None, None]
        pub = offer.get("publication") or {}
        target = offer.get("target_diploma") or {}
        apply = o.get("apply") or {}
        ext = ident.get("id") or ident.get("partner_job_id")
        if not ext or not offer.get("title"):
            return None
        desc = "\n\n".join(x for x in [offer.get("description") or "",
                                        "Compétences visées : " + ", ".join(offer.get("desired_skills") or []) if offer.get("desired_skills") else "",
                                        "Compétences à acquérir : " + ", ".join(offer.get("to_be_acquired_skills") or []) if offer.get("to_be_acquired_skills") else "",
                                        offer.get("access_conditions") and ("Conditions : " + ", ".join(offer.get("access_conditions"))) or ""] if x)
        address = loc.get("address") or ""
        status = (offer.get("status") or "").lower()
        return RawJob(
            source="la_bonne_alternance", external_id=str(ext), title=offer.get("title", ""),
            company=wp.get("brand") or wp.get("name") or wp.get("legal_name") or "",
            description=desc, url=apply.get("url"), location_label=address,
            city=address.split(" ")[-1] if address else None,
            latitude=coords[1] if len(coords) > 1 else None, longitude=coords[0] if coords else None,
            contract_hint="alternance " + " ".join(contract.get("type") or []), remote_hint=contract.get("remote"),
            published_at=parse_dt(pub.get("creation")), expires_at=parse_dt(pub.get("expiration")),
            education_hint=target.get("label") or (f"niveau {target.get('european')}" if target.get("european") else None),
            company_size_hint=wp.get("size"), is_closed=status in ("pourvue", "annulée", "annulee", "filled", "canceled"),
            raw={"identifier": ident, "partner": ident.get("partner_label")},
        )
