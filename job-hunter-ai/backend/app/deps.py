from __future__ import annotations

from urllib.parse import urlparse

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import User
from .security import COOKIE_NAME, decode_access_token

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def csrf_guard(request: Request) -> None:
    """Défense en profondeur (cookie SameSite=Strict) : l'Origin des requêtes mutantes doit être l'application."""
    if request.method in SAFE_METHODS:
        return
    origin = request.headers.get("origin") or request.headers.get("referer")
    if not origin:
        return  # clients non navigateurs (tests, CLI) : le cookie SameSite protège déjà les navigateurs
    # x-forwarded-host : hôte public vu par le navigateur quand le frontend relaie /api
    allowed = {urlparse(get_settings().frontend_origin).netloc, request.headers.get("host", ""),
               request.headers.get("x-forwarded-host", "")}
    if urlparse(origin).netloc not in allowed:
        raise HTTPException(403, "Origine non autorisée")


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    csrf_guard(request)
    token = request.cookies.get(COOKIE_NAME)
    auth = request.headers.get("authorization", "")
    if not token and auth.lower().startswith("bearer "):
        token = auth[7:]
    uid = decode_access_token(token) if token else None
    if uid is None:
        raise HTTPException(401, "Authentification requise")
    user = db.get(User, uid)
    if not user or not user.is_active:
        raise HTTPException(401, "Compte inactif")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Réservé à l'administrateur")
    return user


def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None
