"""
- Schemas for RAG documents admin endpoints.
"""

from typing import List
from pydantic import BaseModel


class RagDocumentResponse(BaseModel):
    # single document
    id: int
    uploader_account_id: int
    filename: str
    content_type: str | None = None
    file_path: str | None = None
    file_size: int | None = None

    class Config:
        from_attributes = True


class RagDocumentListResponse(BaseModel):
    # list documents
    items: List[RagDocumentResponse]
