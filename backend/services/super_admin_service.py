"""
- Business logic for super-admin account management.
- Now supports filtering by role and status, so the single /super-admin/accounts route can mimic the old “admins-only” or “users-only” lists.
- Keeps the existing "get by id" and "change status" behavior unchanged.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from crud.accounts import (
    list_accounts,
    get_account_by_id,
    update_account_status,
)
from schemas.account import AccountResponse
from models.account import AccountStatus, AccountRole


# single-line comment: list all accounts as Pydantic responses, optionally filtered by role/status.
def list_all_accounts(
    db: Session,
    *,
    role: str | None = None,
    status: str | None = None,
) -> list[AccountResponse]:
    role_enum: AccountRole | None = None
    status_enum: AccountStatus | None = None

    if role is not None:
        # will raise ValueError if an unknown role is passed → better to let FastAPI surface 422 upstream if needed
        role_enum = AccountRole(role)

    if status is not None:
        status_enum = AccountStatus(status)

    rows = list_accounts(db, role=role_enum, status=status_enum)
    return [
        AccountResponse(
            id=r.id,
            email=r.email,
            name=r.name,
            role=r.role.value,
            status=r.status.value,
            logo_url=r.logo_url,
        )
        for r in rows
    ]


# single-line comment: load account or 404.
def get_account_or_404(db: Session, account_id: int) -> AccountResponse:
    acct = get_account_by_id(db, account_id)
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    return AccountResponse(
        id=acct.id,
        email=acct.email,
        name=acct.name,
        role=acct.role.value,
        status=acct.status.value,
        logo_url=acct.logo_url,
    )


# single-line comment: change status for an account that exists.
def change_account_status(db: Session, account_id: int, status_value: str) -> AccountResponse:
    acct = get_account_by_id(db, account_id)
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    acct = update_account_status(db, acct, AccountStatus(status_value))
    return AccountResponse(
        id=acct.id,
        email=acct.email,
        name=acct.name,
        role=acct.role.value,
        status=acct.status.value,
        logo_url=acct.logo_url,
    )
