"""Adzuna — API officielle (agrégateur, couvre la France). Clés gratuites : https://developer.adzuna.com"""
from __future__ import annotations

from ..config import get_settings
from ..services.normalize import RawJob
from .base import Connector, ConnectorError, NotConfigured, SearchQuery, parse_dt

URL = "https://api.adzuna.com/v1/api/jobs/fr/search/{page}"


class AdzunaConnector(Connector):
    key = "adzuna"
    label = "Adzuna"
    docs_url = "https://developer.adzuna.com/docs/search"
    required_env = ("ADZUNA_APP_ID", "ADZUNA_APP_KEY")
    notes = "Agrégateur officiel ; descriptions tronquées (lien vers l'annonce complète). Salaires parfois estimés (signalé)."

    def search(self, q: SearchQuery) -> list[RawJob]:
        if not self.configured():
            raise NotConfigured("Clés Adzuna manquantes")
        s = get_settings()
        out: dict[str, RawJob] = {}
        locations = [None] if q.national or not q.locations else q.locations
        with self.http() as client:
            for kw in q.keywords or [""]:
                for loc in locations:
                    params = {"app_id": s.adzuna_app_id, "app_key": s.adzuna_app_key, "results_per_page": min(q.max_results_per_keyword, 50),
                              "content-type": "application/json"}
                    if kw:
                        params["what"] = kw
                    if loc:
                        params["where"] = "Ile-de-France" if loc == "Île-de-France" else loc
                        params["distance"] = q.radius_km
                    if q.published_days:
                        params["max_days_old"] = q.published_days
                    if q.contracts and set(q.contracts) <= {"cdi"}:
                        params["permanent"] = 1
                    r = client.get(URL.format(page=1), params=params)
                    if r.status_code != 200:
                        raise ConnectorError(f"Adzuna : HTTP {r.status_code}")
                    for o in r.json().get("results", []):
                        job = self._map(o)
                        out[job.external_id] = job
        return list(out.values())

    @staticmethod
    def _map(o: dict) -> RawJob:
        loc = o.get("location") or {}
        area = loc.get("area") or []
        ctype = {"permanent": "CDI", "contract": "CDD"}.get(o.get("contract_type") or "", "")
        return RawJob(
            source="adzuna", external_id=str(o.get("id")), title=o.get("title", "").replace("<strong>", "").replace("</strong>", ""),
            company=(o.get("company") or {}).get("display_name", ""), description=o.get("description", ""),
            url=o.get("redirect_url"), location_label=loc.get("display_name", ""), city=area[-1] if area else None,
            latitude=o.get("latitude"), longitude=o.get("longitude"), contract_hint=ctype,
            salary_min=o.get("salary_min"), salary_max=o.get("salary_max"), salary_period="year" if o.get("salary_min") else None,
            salary_is_estimated=str(o.get("salary_is_predicted")) == "1", published_at=parse_dt(o.get("created")), raw=o,
        )
