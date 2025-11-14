"""
- CRUD helpers for the unified `accounts` table (super_admin, admin, user).
- Now supports optional filtering by role and status so the super-admin list endpoint can show only admins or only users.
- Kept backwards compatibility: calling list_accounts(...) with no filters still returns everything.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from models.account import Account, AccountRole, AccountStatus


# single-line comment: get a single account by email (used by login/register).
def get_account_by_email(db: Session, email: str) -> Optional[Account]:
    return db.execute(select(Account).where(Account.email == email)).scalar_one_or_none()


# single-line comment: get a single account by id (used by profile, super-admin, auth refresh).
def get_account_by_id(db: Session, account_id: int) -> Optional[Account]:
    return db.get(Account, account_id)


# single-line comment: list accounts, optionally filtering by role and/or status.
def list_accounts(
    db: Session,
    *,
    role: AccountRole | None = None,
    status: AccountStatus | None = None,
) -> List[Account]:
    stmt = select(Account).order_by(Account.id.desc())
    if role is not None:
        stmt = stmt.where(Account.role == role)
    if status is not None:
        stmt = stmt.where(Account.status == status)
    return db.execute(stmt).scalars().all()


# single-line comment: create a new account row (role + status are decided by the caller).
def create_account(
    db: Session,
    *,
    email: str,
    name: str | None,
    role: AccountRole,
    status: AccountStatus,
) -> Account:
    acct = Account(
        email=email,
        name=name,
        role=role,
        status=status,
    )
    db.add(acct)
    db.commit()
    db.refresh(acct)
    return acct


# single-line comment: update basic account fields (right now we only support name from profile flow).
def update_account(db: Session, account: Account, *, name: str | None = None):
    if name is not None:
        account.name = name
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


# single-line comment: update only the account status (used by super-admin to approve/reject/etc.).
def update_account_status(db: Session, account: Account, status: AccountStatus):
    account.status = status
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


# single-line comment: set or clear the logo URL for an account (used by profile logo upload).
def set_account_logo_url(db: Session, account: Account, logo_url: str | None):
    account.logo_url = logo_url
    db.add(account)
    db.commit()
    db.refresh(account)
    return account
