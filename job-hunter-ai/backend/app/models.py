"""Modèle de données. Toutes les entités métier sont rattachées à un utilisateur (isolation des données)."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from sqlalchemy.types import TypeDecorator

from .db import Base


class UTCDateTime(TypeDecorator):
    """Datetimes toujours « aware » en UTC (SQLite perd le fuseau, PostgreSQL non)."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(200), default="")
    role: Mapped[str] = mapped_column(String(20), default="user")  # user | admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)


class Profile(Base, TimestampMixin):
    """Profil professionnel centralisé : SOURCE DE VÉRITÉ pour le scoring et les documents."""

    __tablename__ = "profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=1)


class ProfileRevision(Base):
    __tablename__ = "profile_revisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    data: Mapped[dict[str, Any]] = mapped_column(JSON)
    note: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class JobOffer(Base, TimestampMixin):
    """Annonce canonique (après déduplication). Les publications multiples sont dans OfferSource."""

    __tablename__ = "job_offers"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    title_norm: Mapped[str] = mapped_column(String(300), index=True)
    company: Mapped[str] = mapped_column(String(200), default="")
    company_norm: Mapped[str] = mapped_column(String(200), index=True, default="")
    company_type: Mapped[str | None] = mapped_column(String(30), nullable=True)  # grand_groupe|pme|esn|public|startup
    sector: Mapped[str | None] = mapped_column(String(30), nullable=True)  # public | prive
    description: Mapped[str] = mapped_column(Text, default="")
    location_label: Mapped[str] = mapped_column(String(200), default="")
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    work_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)  # remote | hybrid | onsite
    contract_types: Mapped[list[str]] = mapped_column(JSON, default=list)
    salary_min_annual: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_max_annual: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_label: Mapped[str | None] = mapped_column(String(200), nullable=True)
    salary_is_estimated: Mapped[bool] = mapped_column(Boolean, default=False)
    education_level: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 2..5 = Bac+N
    experience_years: Mapped[float | None] = mapped_column(Float, nullable=True)
    beginner_ok: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    license_required: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    english_required: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, index=True)
    skills_required: Mapped[list[str]] = mapped_column(JSON, default=list)
    skills_desired: Mapped[list[str]] = mapped_column(JSON, default=list)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    closed_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    republished_count: Mapped[int] = mapped_column(Integer, default=0)
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    needs_details: Mapped[bool] = mapped_column(Boolean, default=False)  # piste incomplète (ex: alerte email)
    injection_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    # Transport
    travel_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    travel_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    travel_source: Mapped[str | None] = mapped_column(String(40), nullable=True)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Scoring
    score: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    score_rules: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    score_method: Mapped[str | None] = mapped_column(String(20), nullable=True)  # rules | hybrid
    scored_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    # État utilisateur
    status: Mapped[str] = mapped_column(String(20), default="new", index=True)  # new | saved | ignored | applied
    first_seen_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)
    last_seen_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    sources: Mapped[list[OfferSource]] = relationship(back_populates="offer", cascade="all, delete-orphan")


class OfferSource(Base):
    __tablename__ = "offer_sources"
    __table_args__ = (UniqueConstraint("user_id", "source", "external_id", name="uq_source_ext"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    offer_id: Mapped[int] = mapped_column(ForeignKey("job_offers.id", ondelete="CASCADE"), index=True)
    source: Mapped[str] = mapped_column(String(40))
    external_id: Mapped[str] = mapped_column(String(300))
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    raw: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    first_seen_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    offer: Mapped[JobOffer] = relationship(back_populates="sources")


class SavedSearch(Base, TimestampMixin):
    __tablename__ = "saved_searches"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    sources: Mapped[list[str]] = mapped_column(JSON, default=list)
    params: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)  # contrats, lieux, rayon, publication...
    frequency: Mapped[str] = mapped_column(String(20), default="manual")  # manual | 6h | daily | weekly
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    next_run_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, index=True)
    last_run_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)


class SearchRun(Base):
    __tablename__ = "search_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    search_id: Mapped[int | None] = mapped_column(ForeignKey("saved_searches.id", ondelete="SET NULL"), nullable=True)
    trigger: Mapped[str] = mapped_column(String(20), default="manual")  # manual | schedule
    status: Mapped[str] = mapped_column(String(20), default="running")  # running | done | failed
    started_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    stats: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    errors: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    report: Mapped[str] = mapped_column(Text, default="")


class Company(Base, TimestampMixin):
    __tablename__ = "companies"
    __table_args__ = (UniqueConstraint("user_id", "name_norm", name="uq_company_user"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    name_norm: Mapped[str] = mapped_column(String(200))
    sector: Mapped[str] = mapped_column(String(60), default="")
    company_type: Mapped[str] = mapped_column(String(30), default="")
    careers_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    ats_provider: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ats_slug: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    watch: Mapped[bool] = mapped_column(Boolean, default=False)
    last_checked_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    last_check_status: Mapped[str | None] = mapped_column(String(300), nullable=True)
    page_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")


class Application(Base, TimestampMixin):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    offer_id: Mapped[int | None] = mapped_column(ForeignKey("job_offers.id", ondelete="SET NULL"), nullable=True)
    company: Mapped[str] = mapped_column(String(200))
    title: Mapped[str] = mapped_column(String(300))
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="a_analyser", index=True)
    applied_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    next_action_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    contacts: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    notes: Mapped[str] = mapped_column(Text, default="")
    validated: Mapped[bool] = mapped_column(Boolean, default=False)
    events: Mapped[list[ApplicationEvent]] = relationship(
        back_populates="application", cascade="all, delete-orphan", order_by="ApplicationEvent.created_at"
    )
    documents: Mapped[list[ApplicationDocument]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )


class ApplicationEvent(Base):
    __tablename__ = "application_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(30))  # status | note | email | document | contact
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    application: Mapped[Application] = relationship(back_populates="events")


class ApplicationDocument(Base):
    """Dossier documentaire figé : exactement ce qui a été envoyé."""

    __tablename__ = "application_documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(30))  # cv | letter | email | linkedin | form | followup | thanks | reply
    title: Mapped[str] = mapped_column(String(300), default="")
    content: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    file_pdf: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_docx: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    application: Mapped[Application] = relationship(back_populates="documents")


class CVVersion(Base, TimestampMixin):
    __tablename__ = "cv_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    template: Mapped[str] = mapped_column(String(40), default="minimal")
    theme: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    content: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    target_offer_id: Mapped[int | None] = mapped_column(ForeignKey("job_offers.id", ondelete="SET NULL"), nullable=True)
    origin: Mapped[str] = mapped_column(String(30), default="manual")  # manual | import | tailored
    revision: Mapped[int] = mapped_column(Integer, default=1)


class CVRevision(Base):
    __tablename__ = "cv_revisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    cv_id: Mapped[int] = mapped_column(ForeignKey("cv_versions.id", ondelete="CASCADE"), index=True)
    revision: Mapped[int] = mapped_column(Integer)
    content: Mapped[dict[str, Any]] = mapped_column(JSON)
    template: Mapped[str] = mapped_column(String(40))
    theme: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    note: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class Letter(Base, TimestampMixin):
    __tablename__ = "letters"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    offer_id: Mapped[int | None] = mapped_column(ForeignKey("job_offers.id", ondelete="SET NULL"), nullable=True)
    kind: Mapped[str] = mapped_column(String(30), default="letter")  # letter | email | linkedin | form | followup | reply | thanks
    style: Mapped[str] = mapped_column(String(30), default="professionnel")
    title: Mapped[str] = mapped_column(String(300), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    generated_by: Mapped[str] = mapped_column(String(20), default="ai")  # ai | template | manual
    analysis: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(30))  # report | match | urgent | followup | company | system
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text, default="")
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(60))
    detail: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class KeyValue(Base):
    """Petits états système (ex : battement de cœur du planificateur)."""

    __tablename__ = "kv"
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)


class UserSecret(Base):
    """Secrets propres à l'utilisateur (ex : webhook), chiffrés (Fernet)."""

    __tablename__ = "user_secrets"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_secret"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(60))
    ciphertext: Mapped[str] = mapped_column(Text)


Index("ix_offer_user_company", JobOffer.user_id, JobOffer.company_norm)
