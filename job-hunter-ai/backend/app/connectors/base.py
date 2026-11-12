from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime

import httpx

from ..config import get_settings
from ..services.normalize import RawJob

log = logging.getLogger(__name__)


@dataclass
class SearchQuery:
    keywords: list[str] = field(default_factory=list)
    contracts: list[str] = field(default_factory=list)
    locations: list[str] = field(default_factory=list)
    radius_km: int = 30
    national: bool = False
    published_days: int | None = 14
    max_results_per_keyword: int = 50


class ConnectorError(RuntimeError):
    pass


class NotConfigured(ConnectorError):
    pass


class Connector(ABC):
    key: str = ""
    label: str = ""
    kind: str = "api"  # api | ats | email | search | manual
    official: bool = True
    docs_url: str = ""
    required_env: tuple[str, ...] = ()
    notes: str = ""

    def configured(self) -> bool:
        s = get_settings()
        return all(getattr(s, e.lower(), "") for e in self.required_env)

    @abstractmethod
    def search(self, q: SearchQuery) -> list[RawJob]: ...

    def http(self) -> httpx.Client:
        return httpx.Client(timeout=20, headers={"User-Agent": get_settings().http_user_agent})

    def describe(self) -> dict:
        return {"key": self.key, "label": self.label, "kind": self.kind, "official": self.official,
                "configured": self.configured(), "required_env": list(self.required_env),
                "docs_url": self.docs_url, "notes": self.notes, "supported": True}


def parse_dt(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, (int, float)):
        from datetime import timezone

        return datetime.fromtimestamp(value / 1000 if value > 1e11 else value, tz=timezone.utc)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
