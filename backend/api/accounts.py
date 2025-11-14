"""
- Super admin routes for viewing and moderating accounts.
- Mounted at /super-admin/accounts
- Now supports optional query params `role` and `status` to filter the unified accounts list (so we don't need separate /admins and /users routes).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.deps import get_db, require_super_admin
from schemas.account import (
    AccountResponse,
    AccountListResponse,
    AccountStatusUpdateRequest,
)
from services.super_admin_service import (
    list_all_accounts,
    change_account_status,
    get_account_or_404,
)

router = APIRouter()


# single-line comment: GET /super-admin/accounts → list all or filtered accounts.
@router.get("/", response_model=AccountListResponse)
def list_accounts(
    role: str | None = None,
    status: str | None = None,
    current=Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    accounts = list_all_accounts(db, role=role, status=status)
    return AccountListResponse(items=accounts)


# single-line comment: GET /super-admin/accounts/{account_id} → load a single account.
@router.get("/{account_id}", response_model=AccountResponse)
def get_account(account_id: int, current=Depends(require_super_admin), db: Session = Depends(get_db)):
    acct = get_account_or_404(db, account_id)
    return acct


# single-line comment: PATCH /super-admin/accounts/{account_id}/status → change activation/rejection/etc.
@router.patch("/{account_id}/status", response_model=AccountResponse)
def update_status(
    account_id: int,
    payload: AccountStatusUpdateRequest,
    current=Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    acct = change_account_status(db, account_id, payload.status)
    return acct
