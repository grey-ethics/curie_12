"""
- CRUD helpers for notifications table.
- Provides create-if-absent for dedupe and list/mark-seen operations.
"""

from typing import List, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from models.notification import Notification, NotificationGoalType


# single-line comment: Create a notification if the dedupe tuple does not already exist.
def create_notification_if_absent(
    db: Session,
    *,
    recipient_email: str,
    recipient_role: str,
    actor_email: str | None,
    goal_type: NotificationGoalType,
    goal_id: str,
    project_id: str | None,
    quarter: str | None,
    year: str | None,
    message: str,
    source_updated_at: datetime | None,
) -> Optional[Notification]:
    stmt = select(Notification).where(
        Notification.recipient_email == recipient_email,
        Notification.goal_type == goal_type,
        Notification.goal_id == goal_id,
        Notification.source_updated_at == source_updated_at,
    )
    existing = db.execute(stmt).scalar_one_or_none()
    if existing:
        return None

    row = Notification(
        recipient_email=recipient_email,
        recipient_role=recipient_role,
        actor_email=actor_email,
        goal_type=goal_type,
        goal_id=goal_id,
        project_id=project_id,
        quarter=quarter,
        year=year,
        message=message,
        seen=False,
        source_updated_at=source_updated_at,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# single-line comment: List notifications for a recipient ordered newest first.
def list_notifications_for_recipient(
    db: Session,
    *,
    recipient_email: str,
    limit: int = 50,
) -> List[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.recipient_email == recipient_email)
        .order_by(desc(Notification.created_at), desc(Notification.id))
        .limit(limit)
    )
    return db.execute(stmt).scalars().all()


# single-line comment: Mark a single notification as seen if it belongs to the recipient.
def mark_notification_seen(
    db: Session,
    *,
    notification_id: int,
    recipient_email: str,
) -> Optional[Notification]:
    row = db.get(Notification, notification_id)
    if not row or row.recipient_email != recipient_email:
        return None
    if not row.seen:
        row.seen = True
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


# single-line comment: Mark all notifications for a recipient as seen.
def mark_all_seen(
    db: Session,
    *,
    recipient_email: str,
) -> int:
    rows = db.execute(
        select(Notification).where(
            Notification.recipient_email == recipient_email,
            Notification.seen == False,  # noqa: E712
        )
    ).scalars().all()

    count = 0
    for r in rows:
        r.seen = True
        db.add(r)
        count += 1
    if count:
        db.commit()
    return count
