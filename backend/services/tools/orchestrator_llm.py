"""
- Orchestrator for routing chat requests to tools.
- Updated so the model knows it only ever gets the CURRENT message's uploads (not the whole session).
- Talent matching tool schema is now relaxed: it can be called without pre-supplying JD/resume JSON because the backend will read the files.
"""

from typing import List, Dict, Any, Optional
from core.openai_client import chat as openai_chat


# single-line comment: The main routing/system prompt sent before user+assistant messages.
MAIN_ORCHESTRATOR_PROMPT = """
You are Curie, the orchestrator for this workspace.

Your job is to ROUTE the user’s request to exactly ONE of the supported capabilities, in this priority order:

1) Talent / recruitment tasks
   - If the user wants to compare / match / rank resumes vs a job description
     → call `talent_match_resumes`.
   - The backend will only pass you the files that were uploaded in THIS message, not the whole history of the chat.
     So if the user is referring to older files, ask them to re-upload those files in the same message.
   - If the user wants you to create / write / generate a job description
     → call `talent_generate_jd`.

2) Document templating
   - If the user gives you a template-like text or asks you to “fill this template” or “generate a letter/report from this template”
     → call `document_generate`.

3) Knowledge / RAG
   - For everything else that looks like “tell me about X”, “what does this document say about Y”, “find info on …”, or any business/domain/informational query
     → call `rag_search` with the user’s query.
   - Prefer to TRY RAG instead of refusing, because users may be referring to uploaded/internal docs.

IMPORTANT about URLs returned by tools:
- Sometimes tools will give you a download URL (for example a CSV under /static/...).
- You MUST repeat and show that URL EXACTLY as the tool returned it.
- Do NOT change protocol, do NOT prepend a domain, do NOT invent placeholders, do NOT replace it with another route.
- If the tool said the URL is `/static/...`, you output `/static/...`.

Routing rules (repeat):
- “compare these resumes”, “rank these candidates”, “match this CV with this JD”, “I uploaded a JD and 2 resumes”, etc.
  → `talent_match_resumes`
- “write/create/generate a JD for …” → `talent_generate_jd`
- “fill this template”, “generate from this template”, text with {placeholders} → `document_generate`
- Otherwise → `rag_search`

Always call exactly ONE tool per turn.
"""


# single-line comment: Return the list of tools that the orchestrator can pick from.
def get_orchestrator_tools() -> List[Dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {
                "name": "talent_match_resumes",
                "description": (
                    "Compare ONE job description with one or more candidate resumes. "
                    "Use this when the user wants to screen or rank candidates. "
                    "The backend will read any files the user uploaded in this message, so parameters are optional."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "job_description": {
                            "type": "string",
                            "description": "The full JD text to compare against (optional because the user may have uploaded a JD file).",
                        },
                        "resumes": {
                            "type": "array",
                            "description": "Optional list of candidate resumes to evaluate; each item may omit text when the user uploaded a file.",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string", "description": "Candidate name or filename"},
                                    "text": {"type": "string", "description": "Resume text content"},
                                },
                            },
                        },
                    },
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "talent_generate_jd",
                "description": (
                    "Generate a job description from a short user request. "
                    "Use this whenever the user asks to create/write a JD."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "role_title": {
                            "type": "string",
                            "description": "Job title or role, e.g. 'Senior Software Engineer'",
                        },
                        "department": {
                            "type": "string",
                            "description": "Optional department or domain, e.g. 'Healthcare' or 'Data Team'",
                        },
                        "notes": {
                            "type": "string",
                            "description": "Extra instructions the user gave (location, hybrid, salary, tech stack).",
                        },
                    },
                    "required": ["role_title"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "rag_search",
                "description": (
                    "Search previously uploaded/admin-indexed documents and return the most relevant snippets "
                    "to help answer the user's question."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "User query to search for"},
                        "limit": {
                            "type": "integer",
                            "description": "How many chunks/snippets to retrieve",
                            "default": 5,
                            "minimum": 1,
                            "maximum": 10,
                        },
                    },
                    "required": ["query"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "document_generate",
                "description": (
                    "Fill or generate a text document based on a template and key-value variables. "
                    "Use this when the user provides a template-like text and wants it filled."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "template": {
                            "type": "string",
                            "description": "Template string that may contain {placeholders}",
                        },
                        "variables": {
                            "type": "object",
                            "description": "Key-value pairs to fill in the template.",
                            "additionalProperties": {"type": "string"},
                        },
                    },
                    "required": ["template"],
                    "additionalProperties": False,
                },
            },
        },
    ]


# single-line comment: Make the actual OpenAI call with our system prompt and tool definitions.
def run_orchestrator_chat(
    *,
    messages: List[Dict[str, Any]],
    system_prompt: Optional[str] = None,
):
    sys_msg = {
        "role": "system",
        "content": system_prompt or MAIN_ORCHESTRATOR_PROMPT,
    }
    payload_messages = [sys_msg] + messages

    resp = openai_chat(
        messages=payload_messages,
        tools=get_orchestrator_tools(),
        tool_choice="auto",
    )
    return resp
