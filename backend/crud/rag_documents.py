"""
- CRUD for RAG documents and chunks.
- Now supports:
    * lookup by content hash (for exact-text dedupe)
    * listing ALL documents (for semantic dedupe)
    * fetching ALL chunks (for semantic search)
    * fetching chunk embeddings for a single doc
- We still sanitize chunk text before inserting so Postgres never sees NULs.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func
import logging

from models.rag_document import RagDocument, RagDocumentChunk

log = logging.getLogger(__name__)


def _sanitize_text_for_db(text: str) -> str:
    """
    Postgres TEXT/VARCHAR cannot contain NUL (0x00) characters.
    Strip them here so any caller of this CRUD stays safe.
    """
    if "\x00" in text:
        text = text.replace("\x00", "")
    return text


# ---------- document-level ops ----------

def create_rag_document(
    db: Session,
    *,
    uploader_account_id: int,
    filename: str,
    content_type: str | None,
    file_path: str | None,
    file_size: int | None,
    content_sha256: str | None,
    doc_embedding: dict | None,
) -> RagDocument:
    doc = RagDocument(
        uploader_account_id=uploader_account_id,
        filename=filename,
        content_type=content_type,
        file_path=file_path,
        file_size=file_size,
        content_sha256=content_sha256,
        doc_embedding=doc_embedding,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_rag_document(db: Session, doc_id: int) -> Optional[RagDocument]:
    return db.get(RagDocument, doc_id)


def get_rag_document_by_hash(db: Session, content_sha256: str) -> Optional[RagDocument]:
    """
    Used for exact-text dedupe: if a doc with the same normalized text hash exists, skip.
    """
    return (
        db.execute(
            select(RagDocument).where(RagDocument.content_sha256 == content_sha256)
        )
        .scalars()
        .first()
    )


def list_rag_documents(db: Session, uploader_account_id: int | None = None) -> List[RagDocument]:
    """
    Original list with optional filter by uploader.
    """
    stmt = select(RagDocument).order_by(RagDocument.created_at.desc())
    if uploader_account_id is not None:
        stmt = stmt.where(RagDocument.uploader_account_id == uploader_account_id)
    return db.execute(stmt).scalars().all()


def list_all_rag_documents(db: Session) -> List[RagDocument]:
    """
    Unfiltered list — used for semantic duplicate checking.
    """
    return (
        db.execute(select(RagDocument).order_by(RagDocument.created_at.desc()))
        .scalars()
        .all()
    )


def delete_rag_document(db: Session, doc: RagDocument) -> None:
    db.delete(doc)
    db.commit()


# ---------- chunk-level ops ----------

def create_rag_chunk(
    db: Session,
    *,
    document_id: int,
    chunk_index: int,
    text: str,
    embedding: dict | None,
) -> RagDocumentChunk:
    clean_text = _sanitize_text_for_db(text)
    if not clean_text:
        log.warning(
            "Skipping empty/NUL-only RAG chunk for document_id=%s, chunk_index=%s",
            document_id,
            chunk_index,
        )
        clean_text = "[empty chunk]"

    chunk = RagDocumentChunk(
        document_id=document_id,
        chunk_index=chunk_index,
        text=clean_text,
        embedding=embedding,
    )
    db.add(chunk)
    db.commit()
    db.refresh(chunk)
    return chunk


def list_rag_chunks_for_doc(db: Session, document_id: int) -> List[RagDocumentChunk]:
    return (
        db.execute(
            select(RagDocumentChunk)
            .where(RagDocumentChunk.document_id == document_id)
            .order_by(RagDocumentChunk.chunk_index.asc())
        )
        .scalars()
        .all()
    )


def fetch_all_rag_chunks(db: Session) -> List[RagDocumentChunk]:
    """
    Return ALL chunks across ALL docs — used for semantic search.
    In a real large deployment you'd push this to the DB/vector store,
    but for now we stay in-Python like the other code you showed.
    """
    return (
        db.execute(
            select(RagDocumentChunk).order_by(
                RagDocumentChunk.document_id.asc(), RagDocumentChunk.chunk_index.asc()
            )
        )
        .scalars()
        .all()
    )


def get_chunk_embeddings_by_doc(db: Session, document_id: int) -> List[list[float]]:
    """
    Helper for semantic dedupe: get all chunk embeddings for one doc.
    """
    rows = (
        db.execute(
            select(RagDocumentChunk)
            .where(RagDocumentChunk.document_id == document_id)
            .order_by(RagDocumentChunk.chunk_index.asc())
        )
        .scalars()
        .all()
    )
    out: List[list[float]] = []
    for r in rows:
        if r.embedding:
            out.append(r.embedding)
    return out


# ---------- legacy simple search (kept for fallback) ----------

def search_rag_chunks(db: Session, query: str, limit: int = 5) -> List[RagDocumentChunk]:
    """
    Kept for backward compatibility: plain ILIKE search.
    We'll *prefer* semantic in the tool, but this can be a fallback.
    """
    like = f"%{query}%"
    return (
        db.execute(
            select(RagDocumentChunk)
            .where(or_(RagDocumentChunk.text.ilike(like)))
            .order_by(func.length(RagDocumentChunk.text).asc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
