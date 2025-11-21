"""
- Chat session title guardrails added:
  • Cap title length at 45 characters using constrained types.
  • Strip surrounding whitespace automatically.
- Keeps existing response models untouched.
- No DB schema changes required.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, constr

# single-line comment: Max allowed characters for a chat session title.
MAX_SESSION_TITLE_LEN = 45
TitleStr = constr(strip_whitespace=True, max_length=MAX_SESSION_TITLE_LEN)  # type: ignore[name-defined]


class ChatSessionCreateRequest(BaseModel):
    # create new chat session (optional title)
    title: TitleStr | None = None


class ChatSessionUpdateRequest(BaseModel):
    # update an existing chat session's title
    title: TitleStr | None = None


class ChatSessionResponse(BaseModel):
    # chat session view
    id: int
    title: str | None = None
    running_summary: str | None = None

    class Config:
        from_attributes = True


class ChatSessionListResponse(BaseModel):
    # list sessions
    items: List[ChatSessionResponse]


class ChatMessageCreateRequest(BaseModel):
    # user sends message text
    content: str


class ChatToolInvocationResponse(BaseModel):
    # widget/tool invocation anchored to a specific assistant message
    id: int
    tool_type: str
    status: str
    input_payload: Dict[str, Any] | None = None
    result_payload: Dict[str, Any] | None = None

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    # single message (user or assistant) with optional widget metadata
    id: int
    role: str
    content: str
    tool_invocation: ChatToolInvocationResponse | None = None

    class Config:
        from_attributes = True


class ChatMessageListResponse(BaseModel):
    # list of messages
    items: List[ChatMessageResponse]


class ChatMessageExchangeResponse(BaseModel):
    """
    Response when posting a new user message:
    - user_message: the stored user message
    - assistant_message: the immediate assistant reply (plain text or tool-trigger)
    """
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse


# ------------ widget run payloads ------------

class ResumeInput(BaseModel):
    # text for a single candidate resume
    name: str
    text: str


class ResumeMatchWidgetRunRequest(BaseModel):
    # widget inputs for resume-match
    job_description: str
    resumes: List[ResumeInput]


class DocGenWidgetRunRequest(BaseModel):
    # widget inputs for document generation
    template: str
    variables: Dict[str, Any] | None = None


class ToolInvocationRunResponse(BaseModel):
    # result of executing a widget once
    invocation: ChatToolInvocationResponse
    assistant_message: ChatMessageResponse | None = None
