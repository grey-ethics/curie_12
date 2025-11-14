"""
- Schemas for super-admin account management.
- Reduced to the schemas that are actually used by the remaining endpoints.
"""

from typing import List
from pydantic import BaseModel, EmailStr


class AccountResponse(BaseModel):
    # account details
    id: int
    email: EmailStr
    name: str | None
    role: str
    status: str
    logo_url: str | None = None

    class Config:
        from_attributes = True


class AccountListResponse(BaseModel):
    # list of accounts
    items: List[AccountResponse]


class AccountStatusUpdateRequest(BaseModel):
    # change status
    status: str
