"""
- Notification routes for Curie users/admins.
- GET /notifications/me lists current user's notifications.
- PATCH /notifications/{id}/seen marks one as seen.
- PATCH /notifications/mark-all-seen marks all as seen.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.deps import get_db, require_user_or_admin
from crud.notifications import (
    list_notifications_for_recipient,
    mark_notification_seen,
    mark_all_seen,
)
from schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    MarkSeenResponse,
)

router = APIRouter()


# single-line comment: Get notifications for the currently logged-in user.
@router.get("/me", response_model=NotificationListResponse)
def list_my_notifications(
    current=Depends(require_user_or_admin),
    db: Session = Depends(get_db),
    limit: int = 50,
):
    rows = list_notifications_for_recipient(db, recipient_email=current["email"], limit=limit)
    return NotificationListResponse(items=rows)


# single-line comment: Mark a single notification as seen.
@router.patch("/{notification_id}/seen", response_model=NotificationResponse)
def mark_one_seen(
    notification_id: int,
    current=Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    row = mark_notification_seen(db, notification_id=notification_id, recipient_email=current["email"])
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    return row


# single-line comment: Mark all notifications for the current user as seen.
@router.patch("/mark-all-seen", response_model=MarkSeenResponse)
def mark_all_seen_endpoint(
    current=Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    count = mark_all_seen(db, recipient_email=current["email"])
    return MarkSeenResponse(success=True)
