"""
- CRUD helpers for chat_messages.
- Create message, list for session, get recent N.
- Also used by the summarization service.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from models.chat_message import ChatMessage, MessageRole


# single-line comment: Create a new chat message row.
def create_chat_message(
    db: Session,
    *,
    session_id: int,
    role: MessageRole,
    content: str,
) -> ChatMessage:
    msg = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


# single-line comment: Get a single message by its primary key.
def get_message_by_id(db: Session, message_id: int) -> Optional[ChatMessage]:
    return db.get(ChatMessage, message_id)


# single-line comment: List all messages for a session, ordered oldest → newest.
def list_messages_for_session(db: Session, session_id: int) -> List[ChatMessage]:
    return (
        db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        )
        .scalars()
        .all()
    )


# single-line comment: Get the last N messages for a session (returned oldest → newest).
def get_last_messages_for_session(db: Session, session_id: int, limit: int = 20) -> List[ChatMessage]:
    return (
        db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(desc(ChatMessage.created_at), desc(ChatMessage.id))
            .limit(limit)
        )
        .scalars()
        .all()
    )[::-1]
