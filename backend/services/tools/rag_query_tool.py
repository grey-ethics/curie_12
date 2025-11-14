# services/tools/rag_query_tool.py
"""
Semantic RAG tool:
- get all chunks from DB
- if they have embeddings → embed query, cosine-rank, top-K
- else → fallback to legacy text search
- then let LLM phrase the answer from context
"""

from dataclasses import dataclass
from typing import List
from sqlalchemy.orm import Session

from crud.rag_documents import fetch_all_rag_chunks, search_rag_chunks
from core.openai_client import chat as openai_chat, embed as openai_embed
import math


@dataclass
class RagSource:
    document_id: int
    chunk_id: int
    text: str


@dataclass
class RagQueryResult:
    answer: str
    sources: List[RagSource]


def _cosine(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb + 1e-8)


def run_rag_query_tool(db: Session, *, query: str, limit: int = 5) -> RagQueryResult:
    # 1) try semantic path
    chunks = fetch_all_rag_chunks(db)
    semantic_chunks = [c for c in chunks if c.embedding]
    if semantic_chunks:
        # embed query
        q_vec = openai_embed(input=[query]).data[0].embedding
        # score
        scored = []
        for ch in semantic_chunks:
            score = _cosine(q_vec, ch.embedding)
            scored.append((score, ch))
        scored.sort(key=lambda x: x[0], reverse=True)
        top = [c for _, c in scored[:limit]]
    else:
        # fallback: legacy LIKE search
        top = search_rag_chunks(db, query, limit=limit)

    if not top:
        return RagQueryResult(answer="No relevant documents found.", sources=[])

    context_parts = []
    sources: List[RagSource] = []
    for ch in top:
        context_parts.append(ch.text)
        sources.append(
            RagSource(
                document_id=ch.document_id,
                chunk_id=ch.id,
                text=ch.text[:800],
            )
        )
    context = "\n---\n".join(context_parts)

    # 2) let LLM phrase the answer from context
    resp = openai_chat(
        messages=[
            {
                "role": "system",
                "content": "You answer using ONLY the provided context. If you don't see the answer, say so.",
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {query}",
            },
        ]
    )
    answer = resp.choices[0].message.content or "I couldn't form an answer."
    return RagQueryResult(answer=answer, sources=sources)
