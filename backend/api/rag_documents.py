"""
- Admin routes for RAG documents.
- Mounted at /admin/rag-documents
- Upload, list, get, delete.
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from core.deps import get_db, require_admin
from schemas.rag import (
    RagDocumentResponse,
    RagDocumentListResponse,
)
from services.rag_documents_service import (
    upload_rag_document,
    list_rag_documents_for_admin,
    get_rag_document_by_id,
    delete_rag_document_by_id,
)

router = APIRouter()


# GET /admin/rag-documents → list
@router.get("/", response_model=RagDocumentListResponse)
def list_docs(current=Depends(require_admin), db: Session = Depends(get_db)):
    docs = list_rag_documents_for_admin(db, current["id"])
    return RagDocumentListResponse(items=docs)


# POST /admin/rag-documents → upload
@router.post("/", response_model=RagDocumentResponse)
def upload_doc(
    current=Depends(require_admin),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
):
    doc = upload_rag_document(db, uploader_account_id=current["id"], upload=file)
    return doc


# GET /admin/rag-documents/{doc_id} → single
@router.get("/{doc_id}", response_model=RagDocumentResponse)
def get_doc(doc_id: int, current=Depends(require_admin), db: Session = Depends(get_db)):
    doc = get_rag_document_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


# DELETE /admin/rag-documents/{doc_id}
@router.delete("/{doc_id}")
def delete_doc(doc_id: int, current=Depends(require_admin), db: Session = Depends(get_db)):
    delete_rag_document_by_id(db, doc_id)
    return {"success": True}
