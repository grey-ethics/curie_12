# services/chat_conversation_service.py
"""
- Chat conversation orchestration for the new TEXT-ONLY chat.

- What changed in this revision (high level):
  • Auto-close widgets silently when the user keeps chatting (already done earlier), AND
    add a friendly assistant message only when the user explicitly presses the Cancel button.
  • Intercept greetings like “hi/hello/hey” so they no longer route to RAG and say
    “No relevant documents found.”; respond with a friendly helper message instead.
  • Keep the original resume/doc-gen widgets intact for explicit flows.
  • Add assistant message emission on explicit cancel endpoint so the thread returns to
    a normal state with a helpful prompt (“How can I help you today?”).

- Notes:
  • No DB schema changes.
  • No routes changed.
  • Other features remain unaffected.
"""

from __future__ import annotations

from typing import List, Dict, Any
import json
import re

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from crud.chat_sessions import (
    create_chat_session,
    list_chat_sessions_for_account,
    get_chat_session_by_id,
    delete_chat_session,
    update_chat_session_title,
)
from crud.chat_messages import (
    create_chat_message,
    list_messages_for_session,
    get_last_messages_for_session,
)
from crud.chat_tool_invocations import (
    create_tool_invocation,
    list_tool_invocations_for_session,
    list_pending_invocations_for_session,
    get_tool_invocation_by_id,
    update_tool_invocation,
    cancel_all_pending_invocations_for_session,
)
from models.chat_message import MessageRole
from models.chat_tool_invocation import ChatToolKind, ChatToolStatus

from schemas.chat import (
    ChatSessionResponse,
    ChatMessageResponse,
    ChatToolInvocationResponse,
    ChatMessageExchangeResponse,
    ToolInvocationRunResponse,
)
from services.message_summarization_service import summarize_session_if_needed
from services.tools.rag_query_tool import run_rag_query_tool
from services.tools.talent_recruitment_tool import match_resumes, match_resumes_from_files, generate_jd
from services.tools.document_generation_tool import run_document_generation
from services.data_storage_service import build_chat_message_upload_path, save_bytes
from core.openai_client import chat as openai_chat


# single-line comment: Convert a ChatToolInvocation DB row into an API schema.
def _invocation_to_response(inv) -> ChatToolInvocationResponse:
    if not inv:
        return None  # type: ignore[return-value]
    return ChatToolInvocationResponse(
        id=inv.id,
        tool_type=inv.tool_type.value,
        status=inv.status.value,
        input_payload=inv.input_payload or {},
        result_payload=inv.result_payload or None,
    )


# single-line comment: Convert a ChatMessage DB row plus optional invocation into an API schema.
def _message_to_response(msg, invocation=None) -> ChatMessageResponse:
    inv_resp = _invocation_to_response(invocation) if invocation is not None else None
    return ChatMessageResponse(
        id=msg.id,
        role=msg.role.value,
        content=msg.content,
        tool_invocation=inv_resp,
    )


# single-line comment: Convert a ChatSession DB row to API schema.
def _session_to_response(sess) -> ChatSessionResponse:
    return ChatSessionResponse(id=sess.id, title=sess.title, running_summary=sess.running_summary)


# single-line comment: Use LLM to classify the latest user message into resume_match/doc_gen/rag.
def _classify_intent(user_content: str) -> str:
    system = (
        "You are an intent classifier for a chat application.\n"
        "You MUST respond with JSON of the form {\"intent\": \"resume_match\" | \"doc_gen\" | \"rag\"}.\n"
        "- Use \"resume_match\" if the user wants to compare/match/rank resumes/CVs against a job description, "
        "including candidate screening, ranking, shortlisting, etc.\n"
        "- Use \"doc_gen\" if the user wants to generate/fill a document from a template or says anything like "
        "\"document generation\", \"fill this template\", \"create a letter/report\" from a template.\n"
        "- Otherwise use \"rag\" for general Q&A or questions about documents/knowledge.\n"
        "Return ONLY JSON, no extra text."
    )
    user = f"User message:\n{user_content}"

    intent = "rag"
    try:
        resp = openai_chat(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
        candidate = str(data.get("intent", "")).lower()
        if candidate in {"resume_match", "doc_gen", "rag"}:
            intent = candidate
    except Exception:
        intent = "rag"
    return intent


# single-line comment: True if the message is just a greeting/salutation.
def _is_greeting(text: str) -> bool:
    s = (text or "").strip().lower()
    # keep it tight so real questions don't get trapped
    return bool(re.fullmatch(r"(hi|hello|hey|yo|good\s+(morning|afternoon|evening))\.?", s))


# -------------------------------------------------------------------------------------------------
# session-level operations
# -------------------------------------------------------------------------------------------------


# single-line comment: Create a new chat session for the given account.
def create_chat_session_for_user(db: Session, *, account_id: int, title: str | None) -> ChatSessionResponse:
    sess = create_chat_session(db, account_id=account_id, title=title)
    return _session_to_response(sess)


# single-line comment: List all chat sessions belonging to the given account.
def list_chat_sessions_for_user(db: Session, account_id: int) -> List[ChatSessionResponse]:
    rows = list_chat_sessions_for_account(db, account_id)
    return [_session_to_response(r) for r in rows]


# single-line comment: Load a chat session for the user or raise 404 if not owned.
def get_session_or_404_for_user(db: Session, session_id: int, account_id: int) -> ChatSessionResponse:
    sess = get_chat_session_by_id(db, session_id)
    if not sess or sess.account_id != account_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return _session_to_response(sess)


# single-line comment: Delete a chat session (messages + tool invocations via cascade) that belongs to the user.
def delete_session_for_user(db: Session, session_id: int, account_id: int) -> None:
    sess = get_chat_session_by_id(db, session_id)
    if not sess or sess.account_id != account_id:
        raise HTTPException(status_code=404, detail="Session not found")
    delete_chat_session(db, sess)


# single-line comment: List ALL messages in the session and attach any tool invocations to their trigger messages.
def list_messages_for_session_for_user(db: Session, session_id: int, account_id: int) -> List[ChatMessageResponse]:
    sess = get_chat_session_by_id(db, session_id)
    if not sess or sess.account_id != account_id:
        raise HTTPException(status_code=404, detail="Session not found")

    msgs = list_messages_for_session(db, session_id)
    invs = list_tool_invocations_for_session(db, session_id)
    inv_by_message_id: dict[int, Any] = {inv.trigger_message_id: inv for inv in invs}

    out: list[ChatMessageResponse] = []
    for m in msgs:
        inv = inv_by_message_id.get(m.id)
        out.append(_message_to_response(m, inv))
    return out


# single-line comment: Rename a chat session owned by the user.
def rename_chat_session_for_user(
    db: Session,
    *,
    session_id: int,
    account_id: int,
    new_title: str | None,
) -> ChatSessionResponse:
    sess = get_chat_session_by_id(db, session_id)
    if not sess or sess.account_id != account_id:
        raise HTTPException(status_code=404, detail="Session not found")
    if new_title and new_title.strip():
        sess = update_chat_session_title(db, sess, new_title.strip())
    return _session_to_response(sess)


# -------------------------------------------------------------------------------------------------
# main chat flow: user message → intent classification → widget or RAG
# -------------------------------------------------------------------------------------------------


# single-line comment: Post a user message, cancel any pending widgets silently, and respond.
def post_user_message_and_respond(
    db: Session,
    *,
    session_id: int,
    account_id: int,
    user_content: str,
) -> ChatMessageExchangeResponse:
    sess = get_chat_session_by_id(db, session_id)
    if not sess or sess.account_id != account_id:
        raise HTTPException(status_code=404, detail="Session not found")

    # Detect if anything is pending BEFORE we cancel (for telemetry if needed).
    had_pending = bool(list_pending_invocations_for_session(db, session_id))

    # Auto-cancel any hanging widgets when the user continues chatting.
    # This keeps the UI clean and removes the inline widget forms.
    cancel_all_pending_invocations_for_session(db, session_id)

    # Store user message
    user_msg = create_chat_message(
        db,
        session_id=session_id,
        role=MessageRole.user,
        content=user_content,
    )
    user_msg_resp = _message_to_response(user_msg)

    # Intercept greetings so they don't go through RAG and produce “No relevant documents found.”
    if _is_greeting(user_content):
        assistant_msg = create_chat_message(
            db,
            session_id=session_id,
            role=MessageRole.assistant,
            content="Hello! How can I help you today?",
        )
        summarize_session_if_needed(db, session_id)
        return ChatMessageExchangeResponse(
            user_message=user_msg_resp,
            assistant_message=_message_to_response(assistant_msg),
        )

    # Classify intent for the remaining cases.
    intent = _classify_intent(user_content)

    # branch: resume-match widget
    if intent == "resume_match":
        assistant_text = (
            "I will open the Resume Match widget so you can provide the job description and candidate resumes."
        )
        assistant_msg = create_chat_message(
            db,
            session_id=session_id,
            role=MessageRole.assistant,
            content=assistant_text,
        )

        inv = create_tool_invocation(
            db,
            session_id=session_id,
            trigger_message_id=assistant_msg.id,
            tool_type=ChatToolKind.resume_match,
            input_payload={"source_user_message_id": user_msg.id},
        )
        assistant_msg_resp = _message_to_response(assistant_msg, inv)
        return ChatMessageExchangeResponse(user_message=user_msg_resp, assistant_message=assistant_msg_resp)

    # branch: doc-gen widget
    if intent == "doc_gen":
        assistant_text = (
            "I will open the Document Generation widget so you can provide a template and variables to fill."
        )
        assistant_msg = create_chat_message(
            db,
            session_id=session_id,
            role=MessageRole.assistant,
            content=assistant_text,
        )

        inv = create_tool_invocation(
            db,
            session_id=session_id,
            trigger_message_id=assistant_msg.id,
            tool_type=ChatToolKind.doc_gen,
            input_payload={"source_user_message_id": user_msg.id},
        )
        assistant_msg_resp = _message_to_response(assistant_msg, inv)
        return ChatMessageExchangeResponse(user_message=user_msg_resp, assistant_message=assistant_msg_resp)

    # default branch: RAG answer
    rag_result = run_rag_query_tool(db, query=user_content, limit=5)
    lines: List[str] = [rag_result.answer or "I couldn't find that in your documents, but I can still help. What would you like to do next?"]
    if rag_result.sources:
        lines.append("")
        lines.append("Sources:")
        for s in rag_result.sources:
            lines.append(f"- doc {s.document_id}, chunk {s.chunk_id}: {s.text[:200]}…")

    assistant_msg = create_chat_message(
        db,
        session_id=session_id,
        role=MessageRole.assistant,
        content="\n".join(lines),
    )

    summarize_session_if_needed(db, session_id)

    assistant_msg_resp = _message_to_response(assistant_msg)
    return ChatMessageExchangeResponse(user_message=user_msg_resp, assistant_message=assistant_msg_resp)


# -------------------------------------------------------------------------------------------------
# widget execution flows (run exactly once)
# -------------------------------------------------------------------------------------------------


# single-line comment: Execute a pending resume-match widget once and return its results (JSON resumes).
def run_resume_match_tool_invocation(
    db: Session,
    *,
    session_id: int,
    account_id: int,
    invocation_id: int,
    job_description: str,
    resumes: List[Dict[str, str]],
) -> ToolInvocationRunResponse:
    sess = get_chat_session_by_id(db, session_id)
    if not sess or sess.account_id != account_id:
        raise HTTPException(status_code=404, detail="Session not found")

    inv = get_tool_invocation_by_id(db, invocation_id)
    if not inv or inv.session_id != session_id:
        raise HTTPException(status_code=404, detail="Tool invocation not found")
    if inv.tool_type != ChatToolKind.resume_match:
        raise HTTPException(status_code=400, detail="Tool invocation is not a resume-match widget")
    if inv.status != ChatToolStatus.pending:
        raise HTTPException(status_code=409, detail="This widget has already been used or cancelled")

    result = match_resumes(job_description, resumes)

    rows_payload: List[Dict[str, Any]] = []
    for r in result.rows:
        rows_payload.append(
            {
                "name": r.name,
                "match": r.match,
                "strengths": r.strengths,
                "weaknesses": r.weaknesses,
                "reason": r.reason,
            }
        )

    input_payload = {
        "job_description": job_description,
        "resumes": resumes,
    }
    result_payload = {
        "job_description": job_description,
        "rows": rows_payload,
        "csv_text": result.csv_text,
    }

    inv = update_tool_invocation(
        db,
        inv,
        status=ChatToolStatus.completed,
        input_payload=input_payload,
        result_payload=result_payload,
    )

    lines: List[str] = ["Here is a summary of the resume match results:"]
    for idx, r in enumerate(rows_payload, start=1):
        lines.append(f"{idx}. {r['name']} — match: {r['match']}%")
    assistant_msg = create_chat_message(
        db,
        session_id=session_id,
        role=MessageRole.assistant,
        content="\n".join(lines),
    )

    summarize_session_if_needed(db, session_id)

    return ToolInvocationRunResponse(
        invocation=_invocation_to_response(inv),
        assistant_message=_message_to_response(assistant_msg),
    )


# single-line comment: Execute a pending doc-gen widget once and return its generated document.
def run_doc_gen_tool_invocation(
    db: Session,
    *,
    session_id: int,
    account_id: int,
    invocation_id: int,
    template: str,
    variables: Dict[str, Any] | None,
) -> ToolInvocationRunResponse:
    sess = get_chat_session_by_id(db, session_id)
    if not sess or sess.account_id != account_id:
        raise HTTPException(status_code=404, detail="Session not found")

    inv = get_tool_invocation_by_id(db, invocation_id)
    if not inv or inv.session_id != session_id:
        raise HTTPException(status_code=404, detail="Tool invocation not found")
    if inv.tool_type != ChatToolKind.doc_gen:
        raise HTTPException(status_code=400, detail="Tool invocation is not a doc-gen widget")
    if inv.status != ChatToolStatus.pending:
        raise HTTPException(status_code=409, detail="This widget has already been used or cancelled")

    content = run_document_generation(template, variables or {})

    input_payload = {
        "template": template,
        "variables": variables or {},
    }
    result_payload = {
        "content": content,
    }

    inv = update_tool_invocation(
        db,
        inv,
        status=ChatToolStatus.completed,
        input_payload=input_payload,
        result_payload=result_payload,
    )

    assistant_msg = create_chat_message(
        db,
        session_id=session_id,
        role=MessageRole.assistant,
        content=f"Here is the generated document:\n\n{content}",
    )

    summarize_session_if_needed(db, session_id)

    return ToolInvocationRunResponse(
        invocation=_invocation_to_response(inv),
        assistant_message=_message_to_response(assistant_msg),
    )


# single-line comment: Execute resume-match using uploaded files (pdf/docx/txt). Also accepts optional JD text.
def run_resume_match_tool_invocation_from_files(
    db: Session,
    *,
    session_id: int,
    account_id: int,
    invocation_id: int,
    job_description: str | None,
    uploads: List[UploadFile],
) -> ToolInvocationRunResponse:
    sess = get_chat_session_by_id(db, session_id)
    if not sess or sess.account_id != account_id:
        raise HTTPException(status_code=404, detail="Session not found")

    inv = get_tool_invocation_by_id(db, invocation_id)
    if not inv or inv.session_id != session_id:
        raise HTTPException(status_code=404, detail="Tool invocation not found")
    if inv.tool_type != ChatToolKind.resume_match:
        raise HTTPException(status_code=400, detail="Tool invocation is not a resume-match widget")
    if inv.status != ChatToolStatus.pending:
        raise HTTPException(status_code=409, detail="This widget has already been used or cancelled")

    saved: List[Dict[str, str]] = []
    for f in uploads or []:
        if not f or not f.filename:
            continue
        path = build_chat_message_upload_path(session_id, inv.trigger_message_id, f.filename)
        data = f.file.read()
        file_path, _ = save_bytes(path, data)
        saved.append({"filename": f.filename, "path": file_path})

    talent_result, final_jd = match_resumes_from_files(
        job_description=job_description, uploaded_files=saved, llm_resumes=None
    )

    rows_payload: List[Dict[str, Any]] = [
        {"name": r.name, "match": r.match, "strengths": r.strengths, "weaknesses": r.weaknesses, "reason": r.reason}
        for r in talent_result.rows
    ]

    inv = update_tool_invocation(
        db,
        inv,
        status=ChatToolStatus.completed,
        input_payload={
            "job_description": job_description or "",
            "uploaded_files": [{"filename": x["filename"]} for x in saved],
        },
        result_payload={"job_description": final_jd, "rows": rows_payload, "csv_text": talent_result.csv_text},
    )

    lines: List[str] = ["Here is a summary of the resume match results:"]
    for idx, r in enumerate(rows_payload, start=1):
        lines.append(f"{idx}. {r['name']} — match: {r['match']}%")
    assistant_msg = create_chat_message(db, session_id=session_id, role=MessageRole.assistant, content="\n".join(lines))

    summarize_session_if_needed(db, session_id)

    return ToolInvocationRunResponse(
        invocation=_invocation_to_response(inv),
        assistant_message=_message_to_response(assistant_msg),
    )


# single-line comment: Cancel a pending widget; if this is an explicit user action, also post a friendly message.
def cancel_tool_invocation_for_user(
    db: Session,
    *,
    session_id: int,
    account_id: int,
    invocation_id: int,
) -> ChatToolInvocationResponse:
    sess = get_chat_session_by_id(db, session_id)
    if not sess or sess.account_id != account_id:
        raise HTTPException(status_code=404, detail="Session not found")

    inv = get_tool_invocation_by_id(db, invocation_id)
    if not inv or inv.session_id != session_id:
        raise HTTPException(status_code=404, detail="Tool invocation not found")

    if inv.status == ChatToolStatus.pending:
        inv = update_tool_invocation(db, inv, status=ChatToolStatus.cancelled)
        # Emit a short assistant message so the UI flows back into normal chat mode.
        create_chat_message(
            db,
            session_id=session_id,
            role=MessageRole.assistant,
            content="Okay, I’ve closed that widget. How can I help you today?",
        )

    return _invocation_to_response(inv)
