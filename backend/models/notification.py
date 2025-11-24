"""
- Stores notifications for Curie users about PMS goal updates.
- Notification recipients are identified by email (matches Curie login).
- Quarter/year are stored as strings to match PMS schema.
- Dedupe uses (recipient_email, goal_type, goal_id, source_updated_at).
"""

import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    Enum,
    UniqueConstraint,
    Index,
    func,
)
from core.db import Base


class NotificationGoalType(str, enum.Enum):
    project_goal = "project_goal"
    yearly_goal = "yearly_goal"


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint(
            "recipient_email",
            "goal_type",
            "goal_id",
            "source_updated_at",
            name="uq_notifications_dedupe",
        ),
        Index("ix_notifications_recipient_seen", "recipient_email", "seen"),
    )

    id = Column(Integer, primary_key=True)

    recipient_email = Column(String(255), nullable=False, index=True)
    recipient_role = Column(String(64), nullable=False)  # projectManager | secondReviewer | mentor

    actor_email = Column(String(255), nullable=True)

    goal_type = Column(Enum(NotificationGoalType), nullable=False)
    goal_id = Column(String(64), nullable=False)  # PMS doc _id as 24-char hex string
    project_id = Column(String(64), nullable=True)

    quarter = Column(String(32), nullable=True)
    year = Column(String(32), nullable=True)

    message = Column(String(1024), nullable=False)

    seen = Column(Boolean, nullable=False, default=False)

    source_updated_at = Column(DateTime(timezone=True), nullable=True)  # PMS updatedAt
    created_at = Column(DateTime(timezone=True), server_default=func.now())
