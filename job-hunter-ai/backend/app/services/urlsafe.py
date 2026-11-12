"""Vérification des URLs et récupération HTTP sûre (anti-SSRF, robots.txt, limites de taille)."""
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import httpx

from ..config import get_settings

MAX_BYTES = 3_000_000

# Domaines dont les CGU interdisent la collecte automatisée : on ne les récupère JAMAIS.
NO_FETCH_DOMAINS = (
    "linkedin.com", "indeed.com", "indeed.fr", "welcometothejungle.com", "apec.fr", "hellowork.com",
    "jobteaser.com", "meteojob.com", "chooseyourboss.com", "glassdoor.com", "glassdoor.fr", "monster.fr",
)


class UnsafeURLError(ValueError):
    pass


def is_display_safe(url: str | None) -> bool:
    """URL affichable dans l'interface (pas de javascript:, data:, etc.)."""
    if not url:
        return False
    p = urlparse(url)
    return p.scheme in ("http", "https") and bool(p.netloc) and "@" not in p.netloc


def clean_url(url: str | None) -> str | None:
    return url if is_display_safe(url) else None


def is_no_fetch_domain(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return any(host == d or host.endswith("." + d) for d in NO_FETCH_DOMAINS)


def _check_host(host: str) -> None:
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as e:
        raise UnsafeURLError(f"Hôte introuvable : {host}") from e
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            raise UnsafeURLError("Adresse IP interne interdite")


def validate_external_url(url: str) -> str:
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        raise UnsafeURLError("Seules les URLs http(s) sont acceptées")
    if not p.hostname or "@" in (p.netloc or ""):
        raise UnsafeURLError("URL invalide")
    if p.port and p.port not in (80, 443, 8080, 8443):
        raise UnsafeURLError("Port non autorisé")
    _check_host(p.hostname)
    return url


def robots_allowed(url: str, client: httpx.Client) -> bool:
    p = urlparse(url)
    robots_url = f"{p.scheme}://{p.netloc}/robots.txt"
    try:
        r = client.get(robots_url, timeout=8)
    except httpx.HTTPError:
        return True  # robots inaccessible : comportement standard = autorisé
    if r.status_code >= 400:
        return True
    rp = RobotFileParser()
    rp.parse(r.text.splitlines())
    return rp.can_fetch(get_settings().http_user_agent, url)


def safe_get(url: str, *, respect_robots: bool = True, max_redirects: int = 4) -> httpx.Response:
    """GET sécurisé : validation à chaque redirection, robots.txt, taille max."""
    if is_no_fetch_domain(url):
        raise UnsafeURLError("Collecte automatique non autorisée par les CGU de ce site — importez le texte manuellement")
    headers = {"User-Agent": get_settings().http_user_agent, "Accept-Language": "fr-FR,fr;q=0.9"}
    with httpx.Client(follow_redirects=False, timeout=15, headers=headers) as client:
        current = url
        for _ in range(max_redirects + 1):
            validate_external_url(current)
            if is_no_fetch_domain(current):
                raise UnsafeURLError("Redirection vers un site non collectable")
            if respect_robots and not robots_allowed(current, client):
                raise UnsafeURLError("robots.txt interdit la récupération de cette page")
            with client.stream("GET", current) as r:
                if r.is_redirect:
                    current = urljoin(current, r.headers.get("location", ""))
                    continue
                body = b""
                for chunk in r.iter_bytes():
                    body += chunk
                    if len(body) > MAX_BYTES:
                        raise UnsafeURLError("Page trop volumineuse")
                return httpx.Response(r.status_code, headers=r.headers, content=body, request=r.request)
        raise UnsafeURLError("Trop de redirections")
