"""
- Common chat routes usable by normal users (and admins).
- CHANGE: add multipart upload variant for the Resume Match widget.
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from core.deps import get_db, require_user_or_admin
from schemas.chat import (
    ChatSessionCreateRequest,
    ChatSessionUpdateRequest,
    ChatSessionResponse,
    ChatSessionListResponse,
    ChatMessageListResponse,
    ChatMessageCreateRequest,
    ChatMessageExchangeResponse,
    ResumeMatchWidgetRunRequest,
    DocGenWidgetRunRequest,
    ToolInvocationRunResponse,
    ChatToolInvocationResponse,
)
from services.chat_conversation_service import (
    create_chat_session_for_user,
    list_chat_sessions_for_user,
    get_session_or_404_for_user,
    list_messages_for_session_for_user,
    post_user_message_and_respond,
    delete_session_for_user,
    rename_chat_session_for_user,
    run_resume_match_tool_invocation,
    run_resume_match_tool_invocation_from_files,  # NEW
    run_doc_gen_tool_invocation,
    cancel_tool_invocation_for_user,
)

router = APIRouter()

@router.get("/sessions", response_model=ChatSessionListResponse)
def list_sessions(current=Depends(require_user_or_admin), db: Session = Depends(get_db)):
    sessions = list_chat_sessions_for_user(db, current["id"])
    return ChatSessionListResponse(items=sessions)

@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(payload: ChatSessionCreateRequest, current=Depends(require_user_or_admin), db: Session = Depends(get_db)):
    return create_chat_session_for_user(db, account_id=current["id"], title=payload.title)

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_session(session_id: int, current=Depends(require_user_or_admin), db: Session = Depends(get_db)):
    return get_session_or_404_for_user(db, session_id, current["id"])

@router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
def rename_session(session_id: int, payload: ChatSessionUpdateRequest, current=Depends(require_user_or_admin), db: Session = Depends(get_db)):
    return rename_chat_session_for_user(db, session_id=session_id, account_id=current["id"], new_title=payload.title)

@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, current=Depends(require_user_or_admin), db: Session = Depends(get_db)):
    delete_session_for_user(db, session_id, current["id"])
    return {"success": True}

@router.get("/sessions/{session_id}/messages", response_model=ChatMessageListResponse)
def list_messages(session_id: int, current=Depends(require_user_or_admin), db: Session = Depends(get_db)):
    msgs = list_messages_for_session_for_user(db, session_id, current["id"])
    return ChatMessageListResponse(items=msgs)

@router.post("/sessions/{session_id}/messages", response_model=ChatMessageExchangeResponse)
def send_message(session_id: int, payload: ChatMessageCreateRequest, current=Depends(require_user_or_admin), db: Session = Depends(get_db)):
    return post_user_message_and_respond(db, session_id=session_id, account_id=current["id"], user_content=payload.content.strip())

@router.post("/sessions/{session_id}/tools/{invocation_id}/resume-match", response_model=ToolInvocationRunResponse)
def run_resume_match_widget(session_id: int, invocation_id: int, payload: ResumeMatchWidgetRunRequest, current=Depends(require_user_or_admin), db: Session = Depends(get_db)):
    resumes = [{"name": r.name, "text": r.text} for r in payload.resumes]
    return run_resume_match_tool_invocation(
        db, session_id=session_id, account_id=current["id"], invocation_id=invocation_id, job_description=payload.job_description, resumes=resumes
    )

# single-line comment: NEW — multipart upload variant for resume files.
@router.post("/sessions/{session_id}/tools/{invocation_id}/resume-match/upload", response_model=ToolInvocationRunResponse)
def run_resume_match_widget_upload(
    session_id: int,
    invocation_id: int,
    job_description: str | None = Form(default=None),
    files: list[UploadFile] = File(default=[]),
    current=Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    return run_resume_match_tool_invocation_from_files(
        db, session_id=session_id, account_id=current["id"], invocation_id=invocation_id, job_description=job_description, uploads=files
    )

@router.post("/sessions/{session_id}/tools/{invocation_id}/doc-gen", response_model=ToolInvocationRunResponse)
def run_doc_gen_widget(session_id: int, invocation_id: int, payload: DocGenWidgetRunRequest, current=Depends(require_user_or_admin), db: Session = Depends(get_db)):
    return run_doc_gen_tool_invocation(
        db, session_id=session_id, account_id=current["id"], invocation_id=invocation_id, template=payload.template, variables=payload.variables or {}
    )

@router.post("/sessions/{session_id}/tools/{invocation_id}/cancel", response_model=ChatToolInvocationResponse)
def cancel_widget(session_id: int, invocation_id: int, current=Depends(require_user_or_admin), db: Session = Depends(get_db)):
    return cancel_tool_invocation_for_user(db, session_id=session_id, account_id=current["id"], invocation_id=invocation_id)
