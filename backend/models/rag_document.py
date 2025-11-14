
"""
- Two tables to store RAG documents and their chunks.
- Documents are uploaded by admins.
- Each chunk may have an embedding for semantic search.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    func,
    Index,
)
from sqlalchemy.orm import relationship
from core.db import Base


class RagDocument(Base):
    # SQLAlchemy model for rag_documents
    __tablename__ = "rag_documents"

    id = Column(Integer, primary_key=True)
    uploader_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=True)

    file_path = Column(String(1024), nullable=True)
    file_size = Column(Integer, nullable=True)
    content_sha256 = Column(String(64), nullable=True, index=True)
    doc_embedding = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chunks = relationship("RagDocumentChunk", back_populates="document", cascade="all, delete-orphan")


class RagDocumentChunk(Base):
    # SQLAlchemy model for rag_document_chunks
    __tablename__ = "rag_document_chunks"

    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("rag_documents.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)

    document = relationship("RagDocument", back_populates="chunks")


Index("ix_rag_document_chunks_doc_idx", RagDocumentChunk.document_id, RagDocumentChunk.chunk_index)
