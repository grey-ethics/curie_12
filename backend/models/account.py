"""
- Single accounts table for super_admin, admin, and user.
- Stores email, name, role, status, optional logo.
- NOTE: password is NOT stored here anymore — passwords live in auth_identities.
"""

import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Enum,
    DateTime,
    UniqueConstraint,
    func,
)
from core.db import Base


class AccountRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    user = "user"


class AccountStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    deactivated = "deactivated"
    rejected = "rejected"


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (UniqueConstraint("email", name="uq_accounts_email"),)

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=True)
    role = Column(Enum(AccountRole), nullable=False, default=AccountRole.user)
    status = Column(Enum(AccountStatus), nullable=False, default=AccountStatus.pending)
    logo_url = Column(String(1024), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
