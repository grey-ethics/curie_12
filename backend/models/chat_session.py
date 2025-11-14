"""
- One row per chat session owned by an account.
- Holds an optional running_summary for long chats.
- Owns relationships to chat messages and tool invocations (widgets like resume-match/doc-gen).
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from core.db import Base


# single-line comment: ChatSession groups all messages and tool invocations for a single user conversation.
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    running_summary = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    tool_invocations = relationship(
        "ChatToolInvocation",
        back_populates="session",
        cascade="all, delete-orphan",
    )
