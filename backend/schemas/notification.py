"""
- Pydantic schemas for notifications API.
- Matches Notification SQL model and exposes minimal client fields.
"""

from datetime import datetime
from pydantic import BaseModel, EmailStr


class NotificationResponse(BaseModel):
    id: int
    recipient_email: EmailStr
    recipient_role: str
    actor_email: EmailStr | None = None
    goal_type: str
    goal_id: str
    project_id: str | None = None
    quarter: str | None = None
    year: str | None = None
    message: str
    seen: bool
    source_updated_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]


class MarkSeenResponse(BaseModel):
    success: bool
