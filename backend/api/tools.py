# api/tools.py
"""
- Optional routes to expose tool-like functionality over HTTP.
- Mounted at /tools (but only added if EXPOSE_TOOLS_HTTP=true)
- Updated to match the new orchestrator + talent tool structure.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.deps import get_db, require_admin
from schemas.tool import (
    OrchestratorRequest,
    OrchestratorResponse,
    DocumentGenerateRequest,
    DocumentGenerateResponse,
    RagToolQueryRequest,
    RagToolQueryResponse,
    TalentRecruitmentRequest,
    TalentRecruitmentResponse,
)
from services.tools.orchestrator_llm import run_orchestrator_chat
from services.tools.document_generation_tool import run_document_generation
from services.tools.rag_query_tool import run_rag_query_tool
from services.tools.talent_recruitment_tool import match_resumes, generate_jd

router = APIRouter()


@router.post("/orchestrate", response_model=OrchestratorResponse)
def tool_orchestrate(payload: OrchestratorRequest):
    # we just wrap one user message and run the orchestrator once
    resp = run_orchestrator_chat(messages=[{"role": "user", "content": payload.prompt}],
                                 system_prompt=payload.system_prompt)
    text = resp.choices[0].message.content or ""
    return OrchestratorResponse(result=text)


# keep a simple “match one resume vs JD” HTTP helper for debugging
@router.post("/talent-recruitment", response_model=TalentRecruitmentResponse)
def tool_talent_recruitment(payload: TalentRecruitmentRequest):
    result = match_resumes(payload.job_description, [{"name": "candidate", "text": payload.resume_text}])
    row = result.rows[0]
    return TalentRecruitmentResponse(
        score=row.match,
        explanation=row.reason,
    )


@router.post("/document-generate", response_model=DocumentGenerateResponse)
def tool_document_generate(payload: DocumentGenerateRequest):
    result = run_document_generation(payload.template, payload.variables or {})
    return DocumentGenerateResponse(content=result)


@router.post("/rag-query", response_model=RagToolQueryResponse)
def tool_rag_query(payload: RagToolQueryRequest, db: Session = Depends(get_db), current=Depends(require_admin)):
    result = run_rag_query_tool(db, query=payload.query, limit=payload.limit)
    # convert dataclasses → pydantic
    return RagToolQueryResponse(
        answer=result.answer,
        sources=[{"document_id": s.document_id, "chunk_id": s.chunk_id, "text": s.text} for s in result.sources],
    )
