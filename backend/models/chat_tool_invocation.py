"""
- Stores tool/widget invocations that are anchored to chat messages.
- Used for UI-based tools (resume-match, doc-gen) that run once and have their own sub-UI.
- Persists both inputs and results so the widget can be replayed on session reload.
"""

import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Enum,
    ForeignKey,
    JSON,
    func,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from core.db import Base


class ChatToolKind(str, enum.Enum):
    # type of widget/tool
    resume_match = "resume_match"
    doc_gen = "doc_gen"


class ChatToolStatus(str, enum.Enum):
    # lifecycle of a widget/tool invocation
    pending = "pending"
    completed = "completed"
    cancelled = "cancelled"


# single-line comment: ChatToolInvocation links a chat message to one concrete tool run (or pending widget).
class ChatToolInvocation(Base):
    __tablename__ = "chat_tool_invocations"
    __table_args__ = (
        UniqueConstraint("trigger_message_id", name="uq_chat_tool_invocations_trigger_message"),
    )

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    trigger_message_id = Column(Integer, ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False, index=True)

    tool_type = Column(Enum(ChatToolKind), nullable=False)
    status = Column(Enum(ChatToolStatus), nullable=False, default=ChatToolStatus.pending)

    # raw JSON payloads so the widget can reconstruct inputs/outputs
    input_payload = Column(JSON, nullable=True)
    result_payload = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    session = relationship("ChatSession", back_populates="tool_invocations")
    trigger_message = relationship("ChatMessage", back_populates="tool_invocation")
