"""Google Programmable Search, alertes email (IMAP) et import manuel."""
from __future__ import annotations

import email
import hashlib
import imaplib
import re
from datetime import datetime, timedelta, timezone
from email.header import decode_header, make_header
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup

from ..config import get_settings
from ..services.normalize import RawJob
from ..services.urlsafe import clean_url, is_no_fetch_domain, safe_get
from .ats import extract_jsonld_jobs
from .base import Connector, ConnectorError, NotConfigured, SearchQuery

CSE_URL = "https://www.googleapis.com/customsearch/v1"


class GoogleCareersConnector(Connector):
    key = "google_cse"
    label = "Google (pages carrières)"
    kind = "search"
    docs_url = "https://developers.google.com/custom-search/v1/overview"
    required_env = ("GOOGLE_CSE_API_KEY", "GOOGLE_CSE_CX")
    notes = ("API Programmable Search officielle (100 requêtes/jour gratuites). Les résultats sur des sites dont les CGU "
             "interdisent la collecte (LinkedIn, Indeed…) sont gardés comme simples pistes, sans visite de la page. "
             "Google a annoncé restreindre cette API : vérifiez la disponibilité pour votre compte.")

    def search(self, q: SearchQuery) -> list[RawJob]:
        if not self.configured():
            raise NotConfigured("Clé Google Programmable Search manquante")
        s = get_settings()
        out: dict[str, RawJob] = {}
        loc = " OR ".join(f'"{x}"' for x in (q.locations or ["Paris"])[:3])
        contract = " OR ".join(f'"{c}"' for c in (q.contracts or ["alternance"])[:3])
        import httpx

        with self.http() as client:
            for kw in (q.keywords or [""])[:5]:
                query = f'"{kw}" ({contract}) ({loc}) (carrières OR careers OR recrutement OR "nous rejoindre")'
                params = {"key": s.google_cse_api_key, "cx": s.google_cse_cx, "q": query, "num": 10, "lr": "lang_fr"}
                if q.published_days:
                    params["dateRestrict"] = f"d{q.published_days}"
                try:
                    r = client.get(CSE_URL, params=params)
                except httpx.HTTPError as e:
                    raise ConnectorError(f"Google : {e}") from e
                if r.status_code != 200:
                    raise ConnectorError(f"Google Programmable Search : HTTP {r.status_code}")
                for item in r.json().get("items", []):
                    link = item.get("link", "")
                    jobs: list[RawJob] = []
                    if not is_no_fetch_domain(link):
                        try:
                            resp = safe_get(link)
                            if resp.status_code < 400:
                                jobs = extract_jsonld_jobs(resp.text, link)
                        except Exception:
                            jobs = []
                    for j in jobs:
                        j.source = "google_cse"
                        out[j.external_id] = j
                    if not jobs:
                        ext = hashlib.sha1(link.encode()).hexdigest()[:20]
                        out[ext] = RawJob(source="google_cse", external_id=ext, title=item.get("title", "")[:300],
                                          description=item.get("snippet", ""), url=link, needs_details=True,
                                          raw={"displayLink": item.get("displayLink")})
        return list(out.values())


# Motifs d'URL d'annonces dans les emails d'alerte des plateformes
ALERT_PATTERNS = {
    "linkedin": r"linkedin\.com/(comm/)?jobs/view/(\d+)",
    "indeed": r"indeed\.[a-z.]+/(rc/clk|viewjob|pagead/clk)[^\"' ]*?(jk=|jobid=)([a-z0-9]+)",
    "welcome_to_the_jungle": r"welcometothejungle\.com/[a-z]{2}/companies/[^/]+/jobs/([a-z0-9\-_]+)",
    "apec": r"apec\.fr/[^\"' ]*?(detail-offre|offre)[^\"' ]*?(\d{6,}[a-z]?)",
    "hellowork": r"hellowork\.com/[a-z]{2}-[a-z]{2}/emplois/(\d+)\.html",
    "jobteaser": r"jobteaser\.com/[a-z]{2}/job-offers/([a-z0-9\-]+)",
    "meteojob": r"meteojob\.com/[^\"' ]*?(\d{6,})",
    "chooseyourboss": r"chooseyourboss\.com/offres?/[^\"' ]*?(\d{4,})",
}


def _decode(h: str | None) -> str:
    try:
        return str(make_header(decode_header(h or "")))
    except Exception:
        return h or ""


def parse_alert_email(html: str, sender: str, subject: str) -> list[RawJob]:
    """Extrait les liens d'annonces d'un email d'alerte (contenu reçu par l'utilisateur : usage personnel)."""
    soup = BeautifulSoup(html, "html.parser")
    jobs: dict[str, RawJob] = {}
    for a in soup.find_all("a", href=True):
        href = a["href"]
        # liens de tracking : récupère l'URL cible si présente en paramètre
        qs = parse_qs(urlparse(href).query)
        for key in ("url", "u", "redirect", "target"):
            if key in qs and qs[key][0].startswith("http"):
                href = qs[key][0]
        for platform, pat in ALERT_PATTERNS.items():
            m = re.search(pat, href, re.I)
            if not m:
                continue
            ext = m.groups()[-1]
            text = " ".join(a.get_text(" ", strip=True).split())
            container = a.find_parent(["td", "div", "li", "tr"])
            context = " ".join(container.get_text(" ", strip=True).split())[:400] if container else ""
            if len(text) < 6 and not context:
                continue
            key = f"{platform}:{ext}"
            existing = jobs.get(key)
            title = text if len(text) >= 6 else context[:120]
            if existing and len(existing.title) >= len(title):
                continue
            company = ""
            mm = re.search(r"(?:chez|at|·|-|\|)\s*([A-Z][\w&'\- ]{1,60})", context)
            if mm:
                company = mm.group(1).strip()
            jobs[key] = RawJob(source=platform, external_id=ext, title=title[:300], company=company,
                               description=f"Piste issue d'une alerte email « {subject} ». Extrait : {context}",
                               url=clean_url(href.split("?")[0] if platform in ("linkedin", "welcome_to_the_jungle", "hellowork") else href),
                               needs_details=True, raw={"from": sender, "subject": subject})
    return list(jobs.values())


class EmailAlertsConnector(Connector):
    key = "email_alerts"
    label = "Alertes email (LinkedIn, Indeed, WTTJ, Apec, HelloWork, JobTeaser, Meteojob, ChooseYourBoss)"
    kind = "email"
    docs_url = ""
    required_env = ("IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD")
    notes = ("Méthode conforme pour les plateformes sans API publique : créez des alertes sur chaque site, "
             "l'agent lit votre boîte (IMAP, lecture seule) et transforme les liens en pistes à compléter.")

    def search(self, q: SearchQuery) -> list[RawJob]:
        if not self.configured():
            raise NotConfigured("IMAP non configuré")
        s = get_settings()
        since = (datetime.now(timezone.utc) - timedelta(days=q.published_days or 7)).strftime("%d-%b-%Y")
        out: list[RawJob] = []
        try:
            box = imaplib.IMAP4_SSL(s.imap_host, s.imap_port)
            box.login(s.imap_user, s.imap_password)
            box.select(s.imap_folder, readonly=True)
            _, ids = box.search(None, f'(SINCE "{since}")')
            for mid in (ids[0].split() if ids and ids[0] else [])[-300:]:
                _, data = box.fetch(mid, "(BODY.PEEK[])")
                msg = email.message_from_bytes(data[0][1])
                sender = _decode(msg.get("From"))
                if not re.search(r"linkedin|indeed|welcometothejungle|welcomekit|apec|hellowork|jobteaser|meteojob|chooseyourboss", sender, re.I):
                    continue
                html = ""
                for part in msg.walk():
                    if part.get_content_type() == "text/html":
                        html = part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", "replace")
                        break
                if html:
                    out += parse_alert_email(html, sender, _decode(msg.get("Subject")))
            box.logout()
        except (imaplib.IMAP4.error, OSError) as e:
            raise ConnectorError(f"IMAP : {e}") from e
        return out


def import_from_url(url: str) -> list[RawJob]:
    """Import d'une annonce depuis une URL (pages autorisées uniquement, JSON-LD JobPosting)."""
    if is_no_fetch_domain(url):
        raise ConnectorError("Ce site interdit la collecte automatisée : collez le texte de l'annonce à la place.")
    r = safe_get(url)
    if r.status_code >= 400:
        raise ConnectorError(f"Page inaccessible (HTTP {r.status_code})")
    jobs = extract_jsonld_jobs(r.text, url)
    if jobs:
        for j in jobs:
            j.source = "manual_url"
        return jobs
    soup = BeautifulSoup(r.text, "html.parser")
    for t in soup(["script", "style", "nav", "footer", "header"]):
        t.decompose()
    title = (soup.find("h1").get_text(strip=True) if soup.find("h1") else (soup.title.string if soup.title else url))[:300]
    text = re.sub(r"\n{3,}", "\n\n", soup.get_text("\n", strip=True))[:20000]
    return [RawJob(source="manual_url", external_id=hashlib.sha1(url.encode()).hexdigest()[:20], title=title,
                   description=text, url=url, raw={"fallback": "text"})]
