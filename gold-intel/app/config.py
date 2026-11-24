"""Configuration : tout vient des variables d'environnement (fichier .env, jamais commité)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load_dotenv() -> None:
    f = ROOT / ".env"
    if not f.exists():
        return
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()


def _f(name: str, default: float) -> float:
    return float(os.environ.get(name, default))


@dataclass(frozen=True)
class Config:
    telegram_token: str = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.environ.get("TELEGRAM_CHAT_ID", "")
    db_path: Path = Path(os.environ.get("GOLD_INTEL_DB", ROOT / "data" / "gold_intel.db"))
    dry_run: bool = os.environ.get("DRY_RUN", "0") == "1"  # 1 = affiche les alertes au lieu de les envoyer

    # Fréquences (secondes)
    gold_poll_s: int = int(_f("GOLD_POLL_S", 10))
    pm_poll_s: int = int(_f("PM_POLL_S", 60))
    pm_discover_s: int = int(_f("PM_DISCOVER_S", 1800))

    # Univers Polymarket
    min_event_volume: float = _f("MIN_EVENT_VOLUME", 500_000)
    min_market_volume24h: float = _f("MIN_MARKET_VOLUME24H", 20_000)
    max_markets: int = int(_f("MAX_MARKETS", 400))

    # Détection de saut (mêmes seuils que la recherche Phase 0)
    jump_dp: float = _f("JUMP_DP", 0.05)
    jump_dlogit: float = _f("JUMP_DLOGIT", 0.25)
    jump_z: float = _f("JUMP_Z", 4.0)
    cluster_min: int = int(_f("CLUSTER_MIN", 15))
    market_cooldown_min: int = int(_f("MARKET_COOLDOWN_MIN", 60))

    # Confirmation par le prix de l'or
    confirm_after_min: tuple[int, ...] = (15, 30)
    confirm_atr_frac: float = _f("CONFIRM_ATR_FRAC", 0.5)
    sl_atr_mult: float = _f("SL_ATR_MULT", 1.5)
    rr: float = _f("RR", 2.0)
    trade_timeout_h: float = _f("TRADE_TIMEOUT_H", 4)

    # Santé des flux
    gold_stale_s: int = int(_f("GOLD_STALE_S", 300))

    # Catégories surveillées -> tags Gamma (marchés « prix de l'or » exclus : circulaires)
    categories: dict = field(default_factory=lambda: {
        "fed": ["fed-rates", "fomc", "fed"],
        "macro_data": ["cpi", "inflation", "macro-indicators", "recession", "gdp"],
        "tariffs": ["tariffs", "trade-war"],
        "geo_middle_east": ["iran", "israel-x-iran", "middle-east"],
        "geo_russia_ukraine": ["ukraine", "russia"],
        "geo_china": ["china", "taiwan"],
        "geo_venezuela": ["venezuela"],
        "us_shutdown": ["gov-shutdown", "government-shutdown"],
    })


CFG = Config()

CAT_FR = {
    "fed": "Fed / taux", "macro_data": "Données macro", "tariffs": "Droits de douane",
    "geo_middle_east": "Moyen-Orient / Iran", "geo_russia_ukraine": "Russie / Ukraine",
    "geo_china": "Chine / Taïwan", "geo_venezuela": "Venezuela / Amériques",
    "us_shutdown": "Shutdown US",
}

# Ce que la recherche Phase 0 a mesuré (2025-2026), affiché dans les alertes pour contexte.
RESEARCH_NOTES = {
    "geo_middle_east": "Lien inversé en 2026 : la paix a fait MONTER l'or, l'escalade l'a fait baisser "
                       "(pétrole → inflation → Fed). En 2025 c'était l'inverse.",
    "fed": "L'or réagit en général AVANT Polymarket (≈1 h). Lien cohérent : baisse de taux → or ↑.",
    "tariffs": "L'or bouge souvent avant Polymarket sur ce thème.",
}
