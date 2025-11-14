
"""
- Connects one account to one authentication provider (local, google, ...).
- For local we also store the password hash here.
- Enforces (provider, provider_account_id) uniqueness.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)
from core.db import Base


class AuthIdentity(Base):
    # SQLAlchemy model for auth_identities
    __tablename__ = "auth_identities"
    __table_args__ = (
        UniqueConstraint("provider", "provider_account_id", name="uq_provider_account"),
    )

    id = Column(Integer, primary_key=True)
    provider = Column(String(64), nullable=False)  # local | google | ...
    provider_account_id = Column(String(255), nullable=False)  # email for local, sub for google
    password_hash = Column(String(255), nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
