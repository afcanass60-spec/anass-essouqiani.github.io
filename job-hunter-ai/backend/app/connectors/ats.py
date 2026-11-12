"""Pages carrières d'entreprises via les API PUBLIQUES de leurs ATS (prévues pour être consommées).

Greenhouse, Lever, SmartRecruiters, Recruitee, Ashby : endpoints JSON publics documentés.
Pour les autres sites carrières : extraction schema.org/JobPosting (JSON-LD) en respectant robots.txt.
"""
from __future__ import annotations

import hashlib
import json
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from ..services.normalize import RawJob
from ..services.urlsafe import safe_get
from .base import ConnectorError, parse_dt

TIMEOUT = 20


def _html_to_text(html: str | None) -> str:
    if not html:
        return ""
    import html as htmllib

    soup = BeautifulSoup(htmllib.unescape(html), "html.parser")
    for li in soup.find_all("li"):
        li.insert_before("\n• ")
    return re.sub(r"\n{3,}", "\n\n", soup.get_text("\n")).strip()


def _get(url: str, params: dict | None = None) -> httpx.Response:
    from ..config import get_settings

    r = httpx.get(url, params=params, timeout=TIMEOUT, headers={"User-Agent": get_settings().http_user_agent})
    if r.status_code == 404:
        raise ConnectorError("Identifiant de page carrière introuvable chez cet ATS")
    if r.status_code != 200:
        raise ConnectorError(f"HTTP {r.status_code}")
    return r


def fetch_greenhouse(slug: str, company: str) -> list[RawJob]:
    data = _get(f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs", {"content": "true"}).json()
    return [RawJob(source="greenhouse", external_id=f"{slug}:{j['id']}", title=j.get("title", ""), company=company,
                   description=_html_to_text(j.get("content")), url=j.get("absolute_url"),
                   location_label=(j.get("location") or {}).get("name", ""), city=(j.get("location") or {}).get("name", "").split(",")[0] or None,
                   published_at=parse_dt(j.get("updated_at")), raw={"id": j["id"]}) for j in data.get("jobs", [])]


def fetch_lever(slug: str, company: str) -> list[RawJob]:
    data = _get(f"https://api.lever.co/v0/postings/{slug}", {"mode": "json"}).json()
    out = []
    for j in data:
        cat = j.get("categories") or {}
        lists = "\n".join(f"{x.get('text', '')}\n{_html_to_text(x.get('content'))}" for x in j.get("lists") or [])
        out.append(RawJob(source="lever", external_id=f"{slug}:{j['id']}", title=j.get("text", ""), company=company,
                          description=(j.get("descriptionPlain") or "") + "\n" + lists, url=j.get("hostedUrl"),
                          location_label=cat.get("location", ""), city=(cat.get("location") or "").split(",")[0] or None,
                          contract_hint=cat.get("commitment", ""), remote_hint=j.get("workplaceType"),
                          published_at=parse_dt(j.get("createdAt")), raw={"id": j["id"]}))
    return out


def fetch_smartrecruiters(slug: str, company: str) -> list[RawJob]:
    data = _get(f"https://api.smartrecruiters.com/v1/companies/{slug}/postings", {"limit": 100}).json()
    out = []
    for j in data.get("content", []):
        loc = j.get("location") or {}
        desc = ""
        try:  # détail (sections de l'annonce)
            d = _get(f"https://api.smartrecruiters.com/v1/companies/{slug}/postings/{j['id']}").json()
            secs = (d.get("jobAd") or {}).get("sections") or {}
            desc = "\n\n".join(_html_to_text((secs.get(k) or {}).get("text")) for k in ("companyDescription", "jobDescription", "qualifications", "additionalInformation"))
        except ConnectorError:
            pass
        out.append(RawJob(source="smartrecruiters", external_id=f"{slug}:{j['id']}", title=j.get("name", ""),
                          company=(j.get("company") or {}).get("name") or company, description=desc,
                          url=f"https://jobs.smartrecruiters.com/{slug}/{j['id']}",
                          location_label=", ".join(x for x in [loc.get("city"), loc.get("country")] if x), city=loc.get("city"),
                          contract_hint=(j.get("typeOfEmployment") or {}).get("label", ""),
                          remote_hint="remote" if loc.get("remote") else None, published_at=parse_dt(j.get("releasedDate")),
                          raw={"id": j["id"]}))
    return out


def fetch_recruitee(slug: str, company: str) -> list[RawJob]:
    data = _get(f"https://{slug}.recruitee.com/api/offers/").json()
    return [RawJob(source="recruitee", external_id=f"{slug}:{j['id']}", title=j.get("title", ""), company=j.get("company_name") or company,
                   description=_html_to_text(j.get("description")) + "\n" + _html_to_text(j.get("requirements")),
                   url=j.get("careers_url"), location_label=j.get("location", ""), city=j.get("city"),
                   postal_code=j.get("postal_code"), contract_hint=j.get("employment_type_code", ""),
                   remote_hint="remote" if j.get("remote") else None, published_at=parse_dt(j.get("published_at")),
                   raw={"id": j["id"]}) for j in data.get("offers", [])]


def fetch_ashby(slug: str, company: str) -> list[RawJob]:
    data = _get(f"https://api.ashbyhq.com/posting-api/job-board/{slug}", {"includeCompensation": "true"}).json()
    return [RawJob(source="ashby", external_id=f"{slug}:{j.get('id') or j.get('jobUrl')}", title=j.get("title", ""), company=company,
                   description=j.get("descriptionPlain") or _html_to_text(j.get("descriptionHtml")), url=j.get("jobUrl"),
                   location_label=j.get("location", ""), city=(j.get("location") or "").split(",")[0] or None,
                   contract_hint=j.get("employmentType", ""), remote_hint="remote" if j.get("isRemote") else j.get("workplaceType"),
                   salary_text=(j.get("compensation") or {}).get("compensationTierSummary"),
                   published_at=parse_dt(j.get("publishedAt")), raw={"id": j.get("id")}) for j in data.get("jobs", []) if j.get("isListed", True)]


PROVIDERS = {
    "greenhouse": fetch_greenhouse, "lever": fetch_lever, "smartrecruiters": fetch_smartrecruiters,
    "recruitee": fetch_recruitee, "ashby": fetch_ashby,
}


def detect_ats(url: str) -> tuple[str | None, str | None]:
    """Détecte l'ATS et l'identifiant depuis l'URL d'une page carrière."""
    p = urlparse(url)
    host, path = (p.hostname or "").lower(), [x for x in p.path.split("/") if x]
    if "greenhouse.io" in host and path:
        return "greenhouse", path[0] if host.startswith(("boards", "job-boards")) else (path[-1] if path else None)
    if host == "jobs.lever.co" and path:
        return "lever", path[0]
    if host in ("jobs.smartrecruiters.com", "careers.smartrecruiters.com") and path:
        return "smartrecruiters", path[0]
    if host.endswith(".recruitee.com"):
        return "recruitee", host.split(".")[0]
    if host == "jobs.ashbyhq.com" and path:
        return "ashby", path[0]
    if "myworkdayjobs.com" in host:
        return "workday", None  # pas d'API publique documentée
    if "welcomekit.co" in host or "welcometothejungle" in host:
        return "wttj", None
    return None, None


def extract_jsonld_jobs(html: str, page_url: str, company_hint: str = "") -> list[RawJob]:
    soup = BeautifulSoup(html, "html.parser")
    jobs: list[RawJob] = []
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(tag.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        items = data if isinstance(data, list) else data.get("@graph", [data]) if isinstance(data, dict) else []
        for it in items:
            if not isinstance(it, dict) or "JobPosting" not in str(it.get("@type")):
                continue
            org = it.get("hiringOrganization") or {}
            loc = it.get("jobLocation") or {}
            loc = loc[0] if isinstance(loc, list) and loc else loc
            addr = (loc.get("address") or {}) if isinstance(loc, dict) else {}
            sal = it.get("baseSalary") or {}
            val = sal.get("value") or {} if isinstance(sal, dict) else {}
            unit = (val.get("unitText") or "").upper() if isinstance(val, dict) else ""
            url = it.get("url") or page_url
            ident = it.get("identifier")
            ext = (ident.get("value") if isinstance(ident, dict) else ident) or hashlib.sha1(f"{url}{it.get('title')}".encode()).hexdigest()[:16]
            jobs.append(RawJob(
                source="career_page", external_id=f"{urlparse(page_url).hostname}:{ext}", title=it.get("title", ""),
                company=(org.get("name") if isinstance(org, dict) else str(org)) or company_hint,
                description=_html_to_text(it.get("description")), url=url,
                location_label=", ".join(x for x in [addr.get("addressLocality"), addr.get("postalCode")] if x),
                city=addr.get("addressLocality"), postal_code=addr.get("postalCode"),
                contract_hint=" ".join(it.get("employmentType")) if isinstance(it.get("employmentType"), list) else str(it.get("employmentType") or ""),
                salary_min=(val.get("minValue") or val.get("value")) if isinstance(val, dict) else None,
                salary_max=val.get("maxValue") if isinstance(val, dict) else None,
                salary_period={"YEAR": "year", "MONTH": "month", "HOUR": "hour"}.get(unit),
                remote_hint="remote" if it.get("jobLocationType") == "TELECOMMUTE" else None,
                published_at=parse_dt(it.get("datePosted")), expires_at=parse_dt(it.get("validThrough")),
                education_hint=json.dumps(it.get("educationRequirements"), ensure_ascii=False) if it.get("educationRequirements") else None,
                experience_hint=json.dumps(it.get("experienceRequirements"), ensure_ascii=False) if it.get("experienceRequirements") else None,
                raw={"jsonld": True}))
    return jobs


def fetch_career_page(url: str, company: str) -> tuple[list[RawJob], str]:
    """Retourne (offres JSON-LD trouvées, hash du contenu) pour une page carrière générique."""
    r = safe_get(url)
    if r.status_code >= 400:
        raise ConnectorError(f"Page carrière : HTTP {r.status_code}")
    text = r.text
    soup = BeautifulSoup(text, "html.parser")
    for t in soup(["script", "style", "noscript"]):
        if t.get("type") != "application/ld+json":
            t.decompose()
    digest = hashlib.sha256(soup.get_text(" ", strip=True).encode()).hexdigest()
    return extract_jsonld_jobs(text, url, company), digest
