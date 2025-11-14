"""
- CRUD helpers for chat_sessions.
- Used by the chat conversation service and summarization service.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from models.chat_session import ChatSession


# single-line comment: Create a chat session row for a given account.
def create_chat_session(db: Session, *, account_id: int, title: str | None = None) -> ChatSession:
    sess = ChatSession(account_id=account_id, title=title or "New chat")
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


# single-line comment: Get a chat session by id.
def get_chat_session_by_id(db: Session, session_id: int) -> Optional[ChatSession]:
    return db.get(ChatSession, session_id)


# single-line comment: List sessions for an account ordered by newest first.
def list_chat_sessions_for_account(db: Session, account_id: int) -> List[ChatSession]:
    return (
        db.execute(select(ChatSession).where(ChatSession.account_id == account_id).order_by(ChatSession.id.desc()))
        .scalars()
        .all()
    )


# single-line comment: Update the chat session title.
def update_chat_session_title(db: Session, session: ChatSession, title: str) -> ChatSession:
    session.title = title
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


# single-line comment: Update the running summary for a chat session.
def update_chat_session_summary(db: Session, session: ChatSession, summary: str) -> ChatSession:
    session.running_summary = summary
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


# single-line comment: Delete a chat session row (messages and tool invocations cascade).
def delete_chat_session(db: Session, session: ChatSession) -> None:
    db.delete(session)
    db.commit()
