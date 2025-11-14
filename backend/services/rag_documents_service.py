"""
- Handles admin RAG document upload and retrieval.
- Now: real extraction, dedupe (exact + semantic), chunking, embeddings.
- Stores file via data_storage_service.
"""

from __future__ import annotations

import hashlib
import math
from io import BytesIO
from pathlib import Path
from typing import List

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from services.data_storage_service import build_rag_document_path, save_bytes
from crud.rag_documents import (
    create_rag_document,
    list_rag_documents,
    list_all_rag_documents,
    get_rag_document,
    delete_rag_document,
    create_rag_chunk,
    get_rag_document_by_hash,
    get_chunk_embeddings_by_doc,
)
from schemas.rag import RagDocumentResponse
from core.openai_client import embed as openai_embed

# semantic duplicate threshold
SEMANTIC_DUP_THRESHOLD = 0.75


# -------------------- helpers --------------------


def _normalize_text_for_hash(text: str) -> bytes:
    import re

    norm = re.sub(r"\s+", " ", (text or "").lower()).strip()
    return norm.encode("utf-8", errors="ignore")


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _extract_text(filename: str, content_type: str | None, data: bytes) -> str:
    """
    Try PDF (2 libs), then docx, then plain text.
    We keep all imports inside to avoid hard dependencies at import time.
    """
    name = filename.lower()
    # PDF
    if name.endswith(".pdf"):
        # 1) try PyMuPDF
        try:
            import fitz  # type: ignore

            doc = fitz.open(stream=data, filetype="pdf")
            return "\n".join(page.get_text() or "" for page in doc)
        except Exception:
            pass
        # 2) try pdfplumber
        try:
            import pdfplumber  # type: ignore

            with pdfplumber.open(BytesIO(data)) as pdf:
                return "\n".join((p.extract_text() or "") for p in pdf.pages)
        except Exception:
            pass
        # 3) fallback
        return data.decode(errors="ignore")

    # DOCX
    if name.endswith(".docx"):
        try:
            from docx import Document  # type: ignore

            d = Document(BytesIO(data))
            return "\n".join(p.text for p in d.paragraphs)
        except Exception:
            return data.decode(errors="ignore")

    # default: text-ish
    return data.decode(errors="ignore")


def _split_text(text: str, max_chars: int = 1200) -> List[str]:
    """
    Simple splitter that respects line boundaries but caps chunk size.
    """
    out: List[str] = []
    buf: List[str] = []
    count = 0
    for line in text.splitlines():
        if count + len(line) + 1 > max_chars:
            out.append("\n".join(buf).strip())
            buf, count = [], 0
        buf.append(line)
        count += len(line) + 1
    if buf:
        out.append("\n".join(buf).strip())
    return [c for c in out if c]


def _embed_many(texts: List[str]) -> List[List[float]]:
    """
    Use our shared OpenAI client wrapper to embed many texts.
    """
    if not texts:
        return []
    resp = openai_embed(input=texts)  # model picked in core.openai_client
    # openai 1.x returns .data list with .embedding
    return [d.embedding for d in resp.data]


def _avg(vectors: List[List[float] | None]) -> List[float] | None:
    vs = [v for v in vectors if v is not None]
    if not vs:
        return None
    dim = len(vs[0])
    sums = [0.0] * dim
    for v in vs:
        for i, x in enumerate(v):
            sums[i] += x
    n = len(vs)
    return [s / n for s in sums]


def _cosine(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb + 1e-8)


def _compute_doc_embedding_from_chunks(chunk_vectors: List[List[float]]) -> List[float] | None:
    return _avg(chunk_vectors)


def _semantic_duplicate_check(db: Session, new_doc_vector: List[float]) -> tuple[int | None, float]:
    """
    Compare the new doc vector against ALL existing docs (or their chunk-averages).
    Return (best_doc_id, score).
    """
    best_id: int | None = None
    best_score = 0.0
    for d in list_all_rag_documents(db):
        dv = d.doc_embedding
        if dv is None:
            # try to reconstruct from chunks
            chunk_vs = get_chunk_embeddings_by_doc(db, d.id)
            if not chunk_vs:
                continue
            dv = _compute_doc_embedding_from_chunks(chunk_vs)
        if not dv:
            continue
        score = _cosine(new_doc_vector, dv)
        if score > best_score:
            best_id, best_score = d.id, score
    return best_id, best_score


# -------------------- public service functions --------------------


def upload_rag_document(db: Session, *, uploader_account_id: int, upload: UploadFile) -> RagDocumentResponse:
    """
    1. read data
    2. extract text
    3. dedupe (exact) by normalized text hash
    4. chunk + embed
    5. dedupe (semantic) by doc embedding
    6. save file to disk
    7. create doc + chunks in DB
    """
    contents = upload.file.read()
    # 1) extract text
    text = _extract_text(upload.filename, upload.content_type, contents)
    if not text.strip():
        raise HTTPException(status_code=400, detail="File could not be parsed into text")

    # 2) exact-text dedupe
    text_hash = _sha256_bytes(_normalize_text_for_hash(text))
    existing = get_rag_document_by_hash(db, text_hash)
    if existing:
        # we choose to *not* create a 2nd copy
        raise HTTPException(
            status_code=409,
            detail=f"Duplicate document detected (same text as doc id={existing.id})",
        )

    # 3) chunk + embed chunks
    chunks_text = _split_text(text)
    chunk_vectors = _embed_many(chunks_text) if chunks_text else []
    doc_vector = _compute_doc_embedding_from_chunks(chunk_vectors) or []

    # 4) semantic dedupe (only if we have a vector)
    if doc_vector:
        match_id, score = _semantic_duplicate_check(db, doc_vector)
        if match_id is not None and score >= SEMANTIC_DUP_THRESHOLD:
            raise HTTPException(
                status_code=409,
                detail=f"Semantically similar document already exists (id={match_id}, similarity={score:.3f})",
            )

    # 5) save file on disk
    path = build_rag_document_path(upload.filename)
    abs_path, _ = save_bytes(path, contents)

    # 6) create doc
    doc = create_rag_document(
        db,
        uploader_account_id=uploader_account_id,
        filename=upload.filename,
        content_type=upload.content_type,
        file_path=abs_path,
        file_size=len(contents),
        content_sha256=text_hash,
        doc_embedding=doc_vector if doc_vector else None,
    )

    # 7) create chunks
    for idx, (chunk_text, vec) in enumerate(zip(chunks_text, chunk_vectors)):
        create_rag_chunk(
            db,
            document_id=doc.id,
            chunk_index=idx,
            text=chunk_text,
            embedding=vec,
        )

    return RagDocumentResponse(
        id=doc.id,
        uploader_account_id=doc.uploader_account_id,
        filename=doc.filename,
        content_type=doc.content_type,
        file_path=doc.file_path,
        file_size=doc.file_size,
    )


# list docs for admin (we just list all for now)
def list_rag_documents_for_admin(db: Session, admin_account_id: int):
    docs = list_rag_documents(db, uploader_account_id=None)
    return [
        RagDocumentResponse(
            id=d.id,
            uploader_account_id=d.uploader_account_id,
            filename=d.filename,
            content_type=d.content_type,
            file_path=d.file_path,
            file_size=d.file_size,
        )
        for d in docs
    ]


def get_rag_document_by_id(db: Session, doc_id: int):
    d = get_rag_document(db, doc_id)
    if not d:
        return None
    return RagDocumentResponse(
        id=d.id,
        uploader_account_id=d.uploader_account_id,
        filename=d.filename,
        content_type=d.content_type,
        file_path=d.file_path,
        file_size=d.file_size,
    )


def delete_rag_document_by_id(db: Session, doc_id: int) -> None:
    d = get_rag_document(db, doc_id)
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")
    delete_rag_document(db, d)
