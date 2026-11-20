"""Configuration centralisée (variables d'environnement, jamais de secrets en dur)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Application ---
    app_name: str = "Job Hunter AI"
    environment: str = "development"  # development | production | test
    log_level: str = "INFO"
    database_url: str = "sqlite:///./jobhunter.db"
    redis_url: str = "redis://localhost:6379/0"
    storage_dir: Path = Path("./storage")
    frontend_origin: str = "http://localhost:3000"

    # --- Sécurité ---
    secret_key: str = Field(default="dev-insecure-change-me-0123456789abcdef", description="Signature JWT")
    encryption_key: str = Field(default="", description="Clé Fernet (base64) pour chiffrer les secrets stockés en base")
    access_token_minutes: int = 60 * 12
    allow_registration: bool = False  # le premier compte peut toujours être créé
    cookie_secure: bool = False

    # --- IA (Claude) ---
    anthropic_api_key: str = ""
    llm_model: str = "claude-opus-5-5"
    llm_effort: str = "medium"
    llm_scoring_enabled: bool = True
    llm_scoring_min_rule_score: int = 45  # n'appelle l'IA que si le score déterministe dépasse ce seuil

    # --- Sources officielles ---
    france_travail_client_id: str = ""
    france_travail_client_secret: str = ""
    france_travail_token_url: str = ""  # surcharge facultative de l'adresse d'authentification
    france_travail_scope: str = ""  # surcharge facultative (défaut : api_offresdemploiv2 o2dsoffre)
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""
    lba_api_token: str = ""  # API apprentissage (La Bonne Alternance)
    google_cse_api_key: str = ""
    google_cse_cx: str = ""

    # --- Transport / géographie ---
    prim_api_key: str = ""  # Île-de-France Mobilités (Navitia) — temps de trajet en transports
    openrouteservice_api_key: str = ""  # temps de trajet voiture

    # --- Alertes email (IMAP) ---
    imap_host: str = ""
    imap_port: int = 993
    imap_user: str = ""
    imap_password: str = ""
    imap_folder: str = "INBOX"

    # --- Notifications sortantes ---
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    notify_email_to: str = ""
    notify_webhook_url: str = ""  # ntfy.sh, Slack, Discord (POST JSON/texte)

    http_user_agent: str = "JobHunterAI/1.0 (+personal job search assistant)"

    @property
    def llm_enabled(self) -> bool:
        return bool(self.anthropic_api_key)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production:
        if s.secret_key.startswith("dev-") or len(s.secret_key) < 32:
            raise RuntimeError("SECRET_KEY doit être défini (32+ caractères) en production")
        if not s.encryption_key:
            raise RuntimeError("ENCRYPTION_KEY doit être défini en production")
    s.storage_dir.mkdir(parents=True, exist_ok=True)
    return s
