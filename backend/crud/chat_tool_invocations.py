"""
- CRUD helpers for chat_tool_invocations.
- Used to create, fetch, list, and update widget/tool invocations anchored to chat messages.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from models.chat_tool_invocation import ChatToolInvocation, ChatToolKind, ChatToolStatus


# single-line comment: Create a new tool invocation row for a given session and trigger message.
def create_tool_invocation(
    db: Session,
    *,
    session_id: int,
    trigger_message_id: int,
    tool_type: ChatToolKind,
    input_payload: Dict[str, Any] | None = None,
) -> ChatToolInvocation:
    inv = ChatToolInvocation(
        session_id=session_id,
        trigger_message_id=trigger_message_id,
        tool_type=tool_type,
        status=ChatToolStatus.pending,
        input_payload=input_payload or {},
        result_payload=None,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


# single-line comment: Get a single tool invocation by id.
def get_tool_invocation_by_id(db: Session, invocation_id: int) -> Optional[ChatToolInvocation]:
    return db.get(ChatToolInvocation, invocation_id)


# single-line comment: List all tool invocations for a session (any status).
def list_tool_invocations_for_session(db: Session, session_id: int) -> List[ChatToolInvocation]:
    return (
        db.execute(
            select(ChatToolInvocation)
            .where(ChatToolInvocation.session_id == session_id)
            .order_by(ChatToolInvocation.id.asc())
        )
        .scalars()
        .all()
    )


# single-line comment: List tool invocations for a session that are still pending.
def list_pending_invocations_for_session(db: Session, session_id: int) -> List[ChatToolInvocation]:
    return (
        db.execute(
            select(ChatToolInvocation)
            .where(
                ChatToolInvocation.session_id == session_id,
                ChatToolInvocation.status == ChatToolStatus.pending,
            )
        )
        .scalars()
        .all()
    )


# single-line comment: Set status and optionally update input/result payloads for an invocation.
def update_tool_invocation(
    db: Session,
    inv: ChatToolInvocation,
    *,
    status: ChatToolStatus | None = None,
    input_payload: Dict[str, Any] | None = None,
    result_payload: Dict[str, Any] | None = None,
) -> ChatToolInvocation:
    if status is not None:
        inv.status = status
    if input_payload is not None:
        inv.input_payload = input_payload
    if result_payload is not None:
        inv.result_payload = result_payload
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


# single-line comment: Cancel all pending tool invocations for a session in one shot.
def cancel_all_pending_invocations_for_session(db: Session, session_id: int) -> None:
    pending = list_pending_invocations_for_session(db, session_id)
    for inv in pending:
        inv.status = ChatToolStatus.cancelled
        db.add(inv)
    if pending:
        db.commit()
