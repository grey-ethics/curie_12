# FILE: api/profile.py
"""
- Endpoints for the current logged-in user's profile.
- /profile/ (GET, PATCH)
- /profile/logo (POST) for uploading a logo.
- /profile/password (POST) for changing the current user's local password.
"""

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from core.deps import get_db, get_current_account
from schemas.profile import (
    ProfileResponse,
    ProfileUpdateRequest,
    ChangePasswordRequest,
    ChangePasswordResponse,
)
from services.profile_update_service import (
    get_profile_for_account,
    update_profile_basic,
    update_profile_logo,
    change_password_for_account,
)

router = APIRouter()


# single-line comment: Return the current user's profile data.
@router.get("/", response_model=ProfileResponse)
def get_profile(current=Depends(get_current_account), db: Session = Depends(get_db)):
    return get_profile_for_account(db, current["id"])


# single-line comment: Update basic fields on the current user's profile (right now only name).
@router.patch("/", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current=Depends(get_current_account),
    db: Session = Depends(get_db),
):
    return update_profile_basic(db, account_id=current["id"], name=payload.name)


# single-line comment: Upload or replace the current user's logo.
@router.post("/logo", response_model=ProfileResponse)
def upload_logo(
    current=Depends(get_current_account),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
):
    return update_profile_logo(db, account_id=current["id"], upload=file)


# single-line comment: Change the current user's local password after verifying the existing one.
@router.post("/password", response_model=ChangePasswordResponse)
def change_password(
    payload: ChangePasswordRequest,
    current=Depends(get_current_account),
    db: Session = Depends(get_db),
):
    return change_password_for_account(
        db,
        account_id=current["id"],
        email=current["email"],
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
