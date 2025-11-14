# FILE: services/profile_update_service.py
"""
- Business logic for profile updates (name, logo).
- Adds a password-change flow for the current user, using the local auth identity.
- Uses data_storage_service to store the logo centrally.
"""

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from crud.accounts import get_account_by_id, update_account, set_account_logo_url
from crud.auth_identities import (
    get_identity_by_provider_account,
    update_identity_password_hash,
)
from services.data_storage_service import build_logo_path, save_bytes
from schemas.profile import ProfileResponse, ChangePasswordResponse
from core.security import verify_password, hash_password


# single-line comment: Convert an account model into a profile response.
def _to_profile_response(account) -> ProfileResponse:
    return ProfileResponse(
        id=account.id,
        email=account.email,
        name=account.name,
        role=account.role.value,
        logo_url=account.logo_url,
    )


# single-line comment: Get full profile data for a specific account id.
def get_profile_for_account(db: Session, account_id: int) -> ProfileResponse:
    acct = get_account_by_id(db, account_id)
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    return _to_profile_response(acct)


# single-line comment: Update basic profile info like the user's name.
def update_profile_basic(db: Session, *, account_id: int, name: str | None) -> ProfileResponse:
    acct = get_account_by_id(db, account_id)
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    acct = update_account(db, acct, name=name)
    return _to_profile_response(acct)


# single-line comment: Store the uploaded logo in storage and link it to the account.
def update_profile_logo(db: Session, *, account_id: int, upload: UploadFile) -> ProfileResponse:
    acct = get_account_by_id(db, account_id)
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")

    contents = upload.file.read()
    path = build_logo_path(upload.filename)
    _, web_path = save_bytes(path, contents)
    acct = set_account_logo_url(db, acct, web_path)
    return _to_profile_response(acct)


# single-line comment: Change the local password for the current account, verifying the old password first.
def change_password_for_account(
    db: Session,
    *,
    account_id: int,
    email: str,
    current_password: str,
    new_password: str,
) -> ChangePasswordResponse:
    # 1) ensure the account actually exists
    acct = get_account_by_id(db, account_id)
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")

    # 2) load the local identity (we key it by email in your project)
    ident = get_identity_by_provider_account(db, "local", email)
    if not ident or ident.account_id != account_id:
        # user does not have a local password configured
        raise HTTPException(status_code=400, detail="Local password login is not configured for this account")

    # 3) verify current password
    existing_hash = ident.password_hash or ""
    if not verify_password(current_password, existing_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # 4) hash and save new password
    new_hash = hash_password(new_password)
    update_identity_password_hash(db, ident, password_hash=new_hash)

    return ChangePasswordResponse(success=True)
