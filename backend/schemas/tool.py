"""
- Schemas for /tools endpoints.
"""

from pydantic import BaseModel
from typing import Dict, Any, List


class OrchestratorRequest(BaseModel):
    # run a system+user prompt on LLM
    prompt: str
    system_prompt: str | None = None


class OrchestratorResponse(BaseModel):
    # LLM response
    result: str


# ===== talent recruitment (renamed from resume match) =====
class TalentRecruitmentRequest(BaseModel):
    # input for talent/recruitment matching
    resume_text: str
    job_description: str


class TalentRecruitmentResponse(BaseModel):
    # output for talent/recruitment matching
    score: float
    explanation: str


class DocumentGenerateRequest(BaseModel):
    # request to generate document from template
    template: str
    variables: Dict[str, Any] | None = None


class DocumentGenerateResponse(BaseModel):
    # generated content
    content: str


class RagToolQueryRequest(BaseModel):
    # query RAG via tool
    query: str
    limit: int = 5


class RagToolSource(BaseModel):
    # source doc snippet
    document_id: int
    chunk_id: int
    text: str


class RagToolQueryResponse(BaseModel):
    # RAG answer + sources
    answer: str
    sources: List[RagToolSource]
