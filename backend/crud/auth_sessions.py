
"""
- CRUD for auth_sessions (refresh sessions).
- Lets us revoke refresh tokens.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from models.auth_session import AuthSession, AuthSessionStatus


# create a new session row
def create_session(
    db: Session,
    *,
    account_id: int,
    refresh_jti: str,
    expires_at: datetime,
    user_agent: str | None,
    ip: str | None,
) -> AuthSession:
    sess = AuthSession(
        account_id=account_id,
        refresh_jti=refresh_jti,
        status=AuthSessionStatus.active,
        user_agent=user_agent,
        ip=ip,
        expires_at=expires_at,
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


# get session by jti
def get_session_by_jti(db: Session, jti: str) -> Optional[AuthSession]:
    return db.execute(select(AuthSession).where(AuthSession.refresh_jti == jti)).scalar_one_or_none()


# revoke a session
def revoke_session(db: Session, jti: str) -> None:
    sess = get_session_by_jti(db, jti)
    if not sess:
        return
    sess.status = AuthSessionStatus.revoked
    db.add(sess)
    db.commit()


# add helper on model via monkey patch so core.auth can call is_revoked()
def _auth_session_is_revoked(self: AuthSession) -> bool:
    if self.status != AuthSessionStatus.active:
        return True
    if self.expires_at and self.expires_at < datetime.utcnow().astimezone(self.expires_at.tzinfo):
        return True
    return False


# attach helper
AuthSession.is_revoked = _auth_session_is_revoked  # type: ignore[attr-defined]
