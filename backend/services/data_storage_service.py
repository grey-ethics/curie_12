"""
- Single source of truth for ALL disk/storage paths used by the app.
- CHANGE: add helpers for chat message upload paths so tools/widgets can save files alongside the invoking message.
- NOTE: directory layout -> storage/chat_data/session_{sid}/message_{mid}/upload_files/<filename>
"""

from __future__ import annotations
from pathlib import Path
from typing import Tuple

from core.settings import Settings

# single-line comment: Resolve storage root from settings (env or default).
def get_storage_root() -> Path:
    s = Settings()
    root = Path(s.STORAGE_ROOT or "./storage").resolve()
    _ensure_dir(root)
    return root

# single-line comment: Ensure a directory exists.
def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)

# single-line comment: Build a path for brand logos.
def build_logo_path(filename: str) -> Path:
    root = get_storage_root() / "logos"
    _ensure_dir(root)
    return (root / filename).resolve()

# single-line comment: Build a path for RAG document uploads.
def build_rag_document_path(filename: str) -> Path:
    root = get_storage_root() / "rag_documents"
    _ensure_dir(root)
    return (root / filename).resolve()

# single-line comment: NEW — build a path for chat message uploads for a given session/message.
def build_chat_message_upload_path(session_id: int, message_id: int, filename: str) -> Path:
    base = get_storage_root() / "chat_data" / f"session_{session_id}" / f"message_{message_id}" / "upload_files"
    _ensure_dir(base)
    return (base / filename).resolve()

# single-line comment: Save bytes to disk, returning (path_str, size).
def save_bytes(path: Path, content: bytes) -> Tuple[str, int]:
    _ensure_dir(path.parent)
    path.write_bytes(content)
    return str(path), len(content)
