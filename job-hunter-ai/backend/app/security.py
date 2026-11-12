"""Authentification (Argon2 + JWT en cookie httpOnly), chiffrement des secrets (Fernet), audit."""
from __future__ import annotations

import base64
import hashlib
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.orm import Session

from .config import get_settings
from .models import AuditLog

_ph = PasswordHasher()
ALGO = "HS256"
COOKIE_NAME = "jh_session"


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, password)
    except (VerifyMismatchError, Exception):
        return False


def validate_password_strength(password: str) -> None:
    if len(password) < 10:
        raise ValueError("Le mot de passe doit contenir au moins 10 caractères")
    classes = sum(
        [any(c.islower() for c in password), any(c.isupper() for c in password),
         any(c.isdigit() for c in password), any(not c.isalnum() for c in password)]
    )
    if classes < 3:
        raise ValueError("Utilisez au moins 3 types de caractères (minuscules, majuscules, chiffres, symboles)")


def create_access_token(user_id: int) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(minutes=s.access_token_minutes)}
    return jwt.encode(payload, s.secret_key, algorithm=ALGO)


def decode_access_token(token: str) -> int | None:
    try:
        data = jwt.decode(token, get_settings().secret_key, algorithms=[ALGO])
        return int(data["sub"])
    except Exception:
        return None


def _fernet() -> Fernet:
    s = get_settings()
    key = s.encryption_key
    if not key:
        # Dev uniquement : dérive une clé de SECRET_KEY (en production ENCRYPTION_KEY est obligatoire)
        key = base64.urlsafe_b64encode(hashlib.sha256(s.secret_key.encode()).digest()).decode()
    return Fernet(key.encode())


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt_secret(token: str) -> str | None:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return None


def audit(db: Session, user_id: int | None, action: str, ip: str | None = None, **detail) -> None:
    db.add(AuditLog(user_id=user_id, action=action, detail=detail, ip=ip))
    db.commit()
