from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import client_ip, current_user
from ..models import Profile, User
from ..security import COOKIE_NAME, audit, create_access_token, hash_password, validate_password_strength, verify_password
from ..services.profile_data import initial_profile
from ..services.seed import seed_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class Register(Credentials):
    full_name: str = Field(default="", max_length=200)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(max_length=200)


def _set_cookie(resp: Response, user_id: int) -> None:
    s = get_settings()
    resp.set_cookie(COOKIE_NAME, create_access_token(user_id), httponly=True, secure=s.cookie_secure,
                    samesite="strict", max_age=s.access_token_minutes * 60, path="/")


def _me(u: User) -> dict:
    return {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role}


@router.get("/bootstrap")
def bootstrap(db: Session = Depends(get_db)):
    count = db.scalar(select(func.count(User.id)))
    return {"needs_setup": count == 0, "registration_open": count == 0 or get_settings().allow_registration}


@router.post("/register")
def register(body: Register, request: Request, response: Response, db: Session = Depends(get_db)):
    count = db.scalar(select(func.count(User.id)))
    if count and not get_settings().allow_registration:
        raise HTTPException(403, "Inscriptions fermées")
    try:
        validate_password_strength(body.password)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    if db.scalar(select(User).where(User.email == body.email.lower())):
        raise HTTPException(409, "Compte déjà existant")
    user = User(email=body.email.lower(), password_hash=hash_password(body.password), full_name=body.full_name,
                role="admin" if count == 0 else "user")
    db.add(user)
    db.flush()
    data = initial_profile()
    data["identity"]["full_name"] = body.full_name
    data["identity"]["email"] = body.email.lower()
    db.add(Profile(user_id=user.id, data=data))
    db.commit()
    seed_user(db, user.id)
    audit(db, user.id, "register", client_ip(request))
    _set_cookie(response, user.id)
    return _me(user)


@router.post("/login")
def login(body: Credentials, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    now = datetime.now(timezone.utc)
    if user and user.locked_until and user.locked_until.replace(tzinfo=timezone.utc) > now:
        raise HTTPException(429, "Trop de tentatives : compte temporairement verrouillé (15 min)")
    if not user or not verify_password(body.password, user.password_hash) or not user.is_active:
        if user:
            user.failed_logins += 1
            if user.failed_logins >= 5:
                user.locked_until = now + timedelta(minutes=15)
                user.failed_logins = 0
            db.commit()
        audit(db, user.id if user else None, "login_failed", client_ip(request), email=body.email.lower())
        raise HTTPException(401, "Identifiants invalides")
    user.failed_logins, user.locked_until = 0, None
    db.commit()
    audit(db, user.id, "login", client_ip(request))
    _set_cookie(response, user.id)
    return _me(user)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(current_user)):
    return _me(user)


@router.post("/password")
def change_password(body: PasswordChange, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(403, "Mot de passe actuel incorrect")
    try:
        validate_password_strength(body.new_password)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    user.password_hash = hash_password(body.new_password)
    db.commit()
    audit(db, user.id, "password_changed", client_ip(request))
    return {"ok": True}
