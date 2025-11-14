"""
- Keeps long chat sessions under control by storing a running summary.
- After N messages, we ask the LLM to summarize and store it on the session.
"""

from sqlalchemy.orm import Session

from crud.chat_messages import get_last_messages_for_session
from crud.chat_sessions import update_chat_session_summary, get_chat_session_by_id
from core.openai_client import chat


# single-line comment: Summarize the session with the LLM once the message count crosses the threshold.
def summarize_session_if_needed(db: Session, session_id: int, threshold: int = 30) -> None:
    messages = get_last_messages_for_session(db, session_id, limit=threshold + 5)
    if len(messages) < threshold:
        return

    history_parts = []
    for m in messages:
        history_parts.append(f"[{m.role.value}] {m.content}")
    joined = "\n".join(history_parts)

    llm_resp = chat(
        messages=[
            {"role": "system", "content": "You are a chat history summarizer."},
            {"role": "user", "content": f"Summarize the following chat so we can continue later:\n{joined}"},
        ]
    )
    summary = llm_resp.choices[0].message.content

    sess = get_chat_session_by_id(db, session_id)
    if sess:
        update_chat_session_summary(db, sess, summary)
