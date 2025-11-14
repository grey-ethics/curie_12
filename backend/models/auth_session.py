
"""
- Stores refresh sessions (one row per refresh token).
- Lets us revoke a single session on logout.
"""

import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Enum,
    ForeignKey,
    func,
    UniqueConstraint,
)
from core.db import Base


class AuthSessionStatus(str, enum.Enum):
    # states of a refresh session
    active = "active"
    revoked = "revoked"
    expired = "expired"


class AuthSession(Base):
    # SQLAlchemy model for auth_sessions
    __tablename__ = "auth_sessions"
    __table_args__ = (
        UniqueConstraint("refresh_jti", name="uq_auth_sessions_refresh_jti"),
    )

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)

    refresh_jti = Column(String(64), nullable=False, index=True)
    status = Column(Enum(AuthSessionStatus), nullable=False, default=AuthSessionStatus.active)

    user_agent = Column(String(255), nullable=True)
    ip = Column(String(64), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
