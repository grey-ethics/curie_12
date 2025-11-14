"""
- Stores every message inside a chat session.
- Role can be user/assistant/system (tool output is summarized as assistant).
- Each message may optionally be associated with a single tool invocation (widget).
"""

import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Enum,
    Text,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from core.db import Base


class MessageRole(str, enum.Enum):
    # message speaker/role
    user = "user"
    assistant = "assistant"
    system = "system"


# single-line comment: ChatMessage represents a single turn in the conversation (user/assistant/system).
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(MessageRole), nullable=False, index=True)
    content = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")
    tool_invocation = relationship(
        "ChatToolInvocation",
        back_populates="trigger_message",
        uselist=False,
    )
