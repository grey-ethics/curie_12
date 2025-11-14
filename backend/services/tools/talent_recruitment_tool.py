# services/tools/talent_recruitment_tool.py
"""
- Talent / recruitment operations used by the orchestrator.
- Now supports taking the CURRENT message's uploaded files (JD + resumes), extracting text here, and then calling OpenAI.
- Chat layer no longer needs to re-open / re-parse all session files — everything file-related happens here.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple
import csv
from io import StringIO, BytesIO
from pathlib import Path

from core.openai_client import chat as openai_chat


@dataclass
class TalentMatchRow:
    name: str
    match: int
    strengths: List[str]
    weaknesses: List[str]
    reason: str


@dataclass
class TalentMatchResult:
    rows: List[TalentMatchRow]
    csv_text: str  # CSV ready to be saved to disk


# single-line comment: Best-effort text extraction for a local file that lives on disk.
def _extract_text_from_local_file(path: str, filename: str) -> str:
    data = Path(path).read_bytes()
    name = filename.lower()

    # PDF
    if name.endswith(".pdf"):
        # 1) try PyPDF2
        try:
            import PyPDF2  # type: ignore

            reader = PyPDF2.PdfReader(BytesIO(data))
            pages = []
            for p in reader.pages:
                pages.append(p.extract_text() or "")
            text = "\n".join(pages).strip()
            if text:
                return text
        except Exception:
            pass

        # 2) try fitz / PyMuPDF
        try:
            import fitz  # type: ignore

            doc = fitz.open(stream=data, filetype="pdf")
            text = "\n".join(page.get_text() or "" for page in doc).strip()
            if text:
                return text
        except Exception:
            pass

        # 3) try pdfplumber
        try:
            import pdfplumber  # type: ignore

            with pdfplumber.open(BytesIO(data)) as pdf:
                pages = [(p.extract_text() or "") for p in pdf.pages]
            text = "\n".join(pages).strip()
            if text:
                return text
        except Exception:
            pass

        return data.decode(errors="ignore")

    # DOCX
    if name.endswith(".docx"):
        try:
            from docx import Document  # type: ignore

            d = Document(BytesIO(data))
            return "\n".join(p.text for p in d.paragraphs)
        except Exception:
            return data.decode(errors="ignore")

    # plain-ish
    return data.decode(errors="ignore")


# single-line comment: Core implementation (unchanged): call the model once per resume and build CSV.
def match_resumes(job_description: str, resumes: List[Dict[str, str]]) -> TalentMatchResult:
    rows: List[TalentMatchRow] = []

    for item in resumes:
        name = item.get("name") or "candidate"
        resume_text = item.get("text") or ""
        prompt = (
            "You are a resume screening assistant.\n"
            "Compare the following resume to the job description.\n"
            "Return JSON with keys: match (0-100), reason, strengths (list), weaknesses (list).\n"
            f"Job Description:\n{job_description}\n"
            f"Resume:\n{resume_text}\n"
        )
        try:
            resp = openai_chat(
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            content = resp.choices[0].message.content
            data = {}
            try:
                import json
                data = json.loads(content or "{}")
            except Exception:
                data = {}
            row = TalentMatchRow(
                name=name,
                match=int(data.get("match", 0)),
                strengths=[str(s) for s in data.get("strengths", [])],
                weaknesses=[str(w) for w in data.get("weaknesses", [])],
                reason=data.get("reason", ""),
            )
        except Exception:
            row = TalentMatchRow(
                name=name,
                match=0,
                strengths=[],
                weaknesses=[],
                reason="Service unavailable",
            )
        rows.append(row)

    # build CSV text
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(["candidate_name", "match", "strengths", "weaknesses", "reason"])
    for r in rows:
        writer.writerow(
            [
                r.name,
                r.match,
                " | ".join(r.strengths),
                " | ".join(r.weaknesses),
                r.reason,
            ]
        )
    csv_text = buf.getvalue()
    return TalentMatchResult(rows=rows, csv_text=csv_text)


# single-line comment: Helper to decide which uploaded file is the JD and which are resumes.
def _split_uploaded_files(uploaded_files: List[Dict[str, str]]) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
    jd_files: List[Dict[str, str]] = []
    resume_files: List[Dict[str, str]] = []

    for f in uploaded_files:
        fname = f.get("filename", "").lower()
        if "job" in fname or "jd" in fname or "description" in fname:
            jd_files.append(f)
        else:
            resume_files.append(f)

    return jd_files, resume_files


# single-line comment: New entrypoint used by chat layer → it gives us file paths + whatever JSON the LLM produced.
def match_resumes_from_files(
    *,
    job_description: str | None,
    uploaded_files: List[Dict[str, str]],
    llm_resumes: List[Dict[str, str]] | None = None,
) -> Tuple[TalentMatchResult, str]:
    llm_resumes = llm_resumes or []
    jd_files, resume_files = _split_uploaded_files(uploaded_files)

    # 1) pick / extract JD
    final_jd_text = (job_description or "").strip()
    if not final_jd_text and jd_files:
        # take the first JD-looking file
        jd_file = jd_files[0]
        final_jd_text = _extract_text_from_local_file(jd_file["path"], jd_file["filename"])

    # 2) collect resume texts from files
    extracted_resumes: List[Dict[str, str]] = []
    for f in resume_files:
        text = _extract_text_from_local_file(f["path"], f["filename"])
        extracted_resumes.append({"name": f["filename"], "text": text})

    # 3) merge with LLM-provided resumes (if any)
    merged_resumes: List[Dict[str, str]] = []
    extracted_idx = 0
    for r in llm_resumes:
        r_name = r.get("name") or f"candidate_{len(merged_resumes)+1}"
        r_text = r.get("text") or ""
        if not r_text and extracted_idx < len(extracted_resumes):
            # fill with extracted text from files
            r_text = extracted_resumes[extracted_idx]["text"]
            if not r.get("name"):
                r_name = extracted_resumes[extracted_idx]["name"]
            extracted_idx += 1
        merged_resumes.append({"name": r_name, "text": r_text})

    # if LLM didn't give any resumes, fall back completely to extracted ones
    if not merged_resumes and extracted_resumes:
        merged_resumes = extracted_resumes

    # 4) absolute last resort: no resumes at all → we still call match_resumes with an empty list
    talent_result = match_resumes(final_jd_text or "Job description not provided.", merged_resumes)

    return talent_result, (final_jd_text or "")


# single-line comment: Generate a human JD from a short description.
def generate_jd(role_title: str, department: str | None = None, notes: str | None = None) -> str:
    sys = "You write professional job descriptions. Use clear sections and bullet points."
    user_parts = [f"Role title: {role_title}"]
    if department:
        user_parts.append(f"Department / domain: {department}")
    if notes:
        user_parts.append(f"Extra notes / constraints: {notes}")

    user = "\n".join(user_parts)
    resp = openai_chat(messages=[{"role": "system", "content": sys}, {"role": "user", "content": user}])
    return resp.choices[0].message.content or ""
