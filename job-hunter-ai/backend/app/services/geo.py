"""Géocodage (Géoplateforme IGN), distances et temps de trajet RÉELS (Navitia IDFM / OpenRouteService).

La distance à vol d'oiseau n'est JAMAIS présentée comme un temps de trajet : si aucun service de
calcul d'itinéraire n'est configuré, `travel_minutes` reste vide et l'interface l'indique.
"""
from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta
from functools import lru_cache

import httpx

from ..config import get_settings
from .normalize import PRESET_LOCATIONS

log = logging.getLogger(__name__)
GEOCODER = "https://data.geopf.fr/geocodage/search"
PRIM_JOURNEYS = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/journeys"
ORS_DIRECTIONS = "https://api.openrouteservice.org/v2/directions/driving-car"


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


@lru_cache(maxsize=2048)
def geocode(query: str) -> dict | None:
    """Retourne {lat, lon, citycode, city, postcode} ou None."""
    if not query:
        return None
    if query in PRESET_LOCATIONS:
        lat, lon = PRESET_LOCATIONS[query]
        return {"lat": lat, "lon": lon, "citycode": None, "city": query, "postcode": None}
    try:
        r = httpx.get(GEOCODER, params={"q": query, "limit": 1, "index": "address"}, timeout=10)
        r.raise_for_status()
        feats = r.json().get("features") or []
    except (httpx.HTTPError, ValueError) as e:
        log.warning("Géocodage impossible pour %s : %s", query, e)
        return None
    if not feats:
        return None
    f = feats[0]
    lon, lat = f["geometry"]["coordinates"]
    p = f.get("properties", {})
    return {"lat": lat, "lon": lon, "citycode": p.get("citycode"), "city": p.get("city"), "postcode": p.get("postcode")}


def _next_weekday_morning() -> datetime:
    d = datetime.now() + timedelta(days=1)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d.replace(hour=8, minute=30, second=0, microsecond=0)


def transit_minutes(origin: tuple[float, float], dest: tuple[float, float]) -> int | None:
    """Temps de trajet en transports en commun (Navitia via PRIM Île-de-France Mobilités), arrivée ~9h."""
    key = get_settings().prim_api_key
    if not key:
        return None
    params = {
        "from": f"{origin[1]};{origin[0]}",
        "to": f"{dest[1]};{dest[0]}",
        "datetime": _next_weekday_morning().strftime("%Y%m%dT%H%M%S"),
        "count": 1,
    }
    try:
        r = httpx.get(PRIM_JOURNEYS, params=params, headers={"apikey": key}, timeout=15)
        r.raise_for_status()
        journeys = r.json().get("journeys") or []
    except (httpx.HTTPError, ValueError) as e:
        log.info("Itinéraire transports indisponible : %s", e)
        return None
    if not journeys:
        return None
    return round(min(j.get("duration", 10**9) for j in journeys) / 60)


def driving_minutes(origin: tuple[float, float], dest: tuple[float, float]) -> int | None:
    key = get_settings().openrouteservice_api_key
    if not key:
        return None
    try:
        r = httpx.get(ORS_DIRECTIONS, params={"api_key": key, "start": f"{origin[1]},{origin[0]}", "end": f"{dest[1]},{dest[0]}"}, timeout=15)
        r.raise_for_status()
        feats = r.json().get("features") or []
        return round(feats[0]["properties"]["summary"]["duration"] / 60) if feats else None
    except (httpx.HTTPError, ValueError, KeyError, IndexError) as e:
        log.info("Itinéraire voiture indisponible : %s", e)
        return None


def compute_travel(origin: tuple[float, float], dest: tuple[float, float], mode: str = "transit") -> tuple[int | None, str | None, str | None]:
    """Retourne (minutes, mode, source). Aucune estimation déguisée."""
    if mode in ("transit", "auto"):
        m = transit_minutes(origin, dest)
        if m is not None:
            return m, "transit", "navitia_idfm"
    if mode in ("car", "auto"):
        m = driving_minutes(origin, dest)
        if m is not None:
            return m, "car", "openrouteservice"
    return None, None, None


def travel_configured() -> dict[str, bool]:
    s = get_settings()
    return {"transit": bool(s.prim_api_key), "car": bool(s.openrouteservice_api_key)}
