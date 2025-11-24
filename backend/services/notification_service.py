"""
- Business logic layer for notifications (optional).
- Fully aligned with models/notification.py and crud/notifications.py.
- Keeps all naming consistent with your Notification SQL model and Pydantic schema.
"""

from typing import List

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from models.notification import Notification
from crud.notifications import (
    list_notifications_for_recipient,
    mark_notification_seen,
    mark_all_seen,
)
from schemas.notification import NotificationResponse


# single-line comment: Convert ORM row into response schema.
def _to_response(row: Notification) -> NotificationResponse:
    # pydantic v2
    try:
        return NotificationResponse.model_validate(row)
    except Exception:
        # pydantic v1 fallback
        return NotificationResponse.from_orm(row)


# single-line comment: List notifications for the current user.
def list_for_current_user(
    db: Session,
    *,
    current_email: str,
    limit: int = 50,
) -> List[NotificationResponse]:
    rows = list_notifications_for_recipient(db, recipient_email=current_email, limit=limit)
    return [_to_response(r) for r in rows]


# single-line comment: Count unseen notifications for the current user.
def unseen_count_for_current_user(db: Session, *, current_email: str) -> int:
    stmt = select(func.count()).select_from(Notification).where(
        Notification.recipient_email == current_email,
        Notification.seen == False,  # noqa: E712
    )
    return int(db.execute(stmt).scalar() or 0)


# single-line comment: Mark one notification as seen if it belongs to current user.
def mark_one_seen_for_current_user(
    db: Session,
    *,
    current_email: str,
    notification_id: int,
) -> NotificationResponse:
    row = mark_notification_seen(db, notification_id=notification_id, recipient_email=current_email)
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _to_response(row)


# single-line comment: Mark all notifications as seen for current user.
def mark_all_seen_for_current_user(db: Session, *, current_email: str) -> int:
    return mark_all_seen(db, recipient_email=current_email)
