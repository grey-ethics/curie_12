# FILE: schemas/profile.py
"""
- Schemas for profile endpoints.
- Includes profile view/update and password change payloads.
"""

from pydantic import BaseModel, EmailStr


class ProfileResponse(BaseModel):
    # current profile view
    id: int
    email: EmailStr
    name: str | None = None
    role: str
    logo_url: str | None = None


class ProfileUpdateRequest(BaseModel):
    # update name, etc.
    name: str | None = None


class ChangePasswordRequest(BaseModel):
    # current user wants to change their password
    current_password: str
    new_password: str


class ChangePasswordResponse(BaseModel):
    # result of change password
    success: bool
