"""
- Central place to create and hold the OpenAI 1.x client.
- Wraps common chat / embedding calls so the rest of the app doesn’t import openai everywhere.
- Uses the model name from settings.CHAT_MODEL where suitable.
"""

from typing import Any, Dict, List, Optional

from core.settings import settings

try:
    # openai >= 1.0 style
    from openai import OpenAI
except Exception as e:  # pragma: no cover
    raise RuntimeError("openai>=1.0.0 is required. Install with `pip install openai`") from e

# single shared client
_client = OpenAI(api_key=settings.OPENAI_API_KEY)


# get the raw client
def get_client() -> OpenAI:
    return _client


# perform a chat completion with messages
def chat(*, messages: List[Dict[str, Any]], model: Optional[str] = None, **kwargs):
    payload: Dict[str, Any] = {
        "model": model or settings.CHAT_MODEL,
        "messages": messages,
    }
    payload.update(kwargs)
    return _client.chat.completions.create(**payload)


# perform embedding
def embed(*, input: Any, model: Optional[str] = None, **kwargs):
    payload: Dict[str, Any] = {
        "model": model or "text-embedding-3-small",
        "input": input,
    }
    payload.update(kwargs)
    return _client.embeddings.create(**payload)