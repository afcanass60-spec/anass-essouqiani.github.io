"""Notifications : in-app (toujours), email SMTP et webhook (si configurés)."""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Notification, UserSecret
from ..security import decrypt_secret
from .urlsafe import UnsafeURLError, validate_external_url

log = logging.getLogger(__name__)


def user_webhook(db: Session, user_id: int) -> str | None:
    sec = db.query(UserSecret).filter_by(user_id=user_id, name="webhook_url").first()
    return decrypt_secret(sec.ciphertext) if sec else (get_settings().notify_webhook_url or None)


def send_email(to: str, subject: str, body: str, attachments: list[tuple[str, bytes, str]] | None = None) -> None:
    s = get_settings()
    if not s.smtp_host:
        raise RuntimeError("SMTP non configuré")
    msg = EmailMessage()
    msg["From"] = s.smtp_from or s.smtp_user
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    for name, data, mime in attachments or []:
        maintype, subtype = mime.split("/", 1)
        msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=name)
    with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=30) as smtp:
        smtp.starttls()
        if s.smtp_user:
            smtp.login(s.smtp_user, s.smtp_password)
        smtp.send_message(msg)


def notify(db: Session, user_id: int, kind: str, title: str, body: str = "", link: str | None = None, *, external: bool = False) -> Notification:
    n = Notification(user_id=user_id, kind=kind, title=title, body=body, link=link)
    db.add(n)
    db.commit()
    if external:
        s = get_settings()
        hook = user_webhook(db, user_id)
        if hook:
            try:
                validate_external_url(hook)
                httpx.post(hook, json={"title": title, "text": f"{title}\n{body}", "content": f"**{title}**\n{body}"},
                           timeout=10, headers={"Title": title.encode("ascii", "ignore").decode()})
            except (httpx.HTTPError, UnsafeURLError) as e:
                log.warning("Webhook en échec : %s", e)
        if s.smtp_host and s.notify_email_to:
            try:
                send_email(s.notify_email_to, f"[Job Hunter AI] {title}", body)
            except Exception as e:  # noqa: BLE001
                log.warning("Email de notification en échec : %s", e)
    return n
