# services/tools/document_generation_tool.py
"""
Simple template filler.
"""

from typing import Dict, Any


def run_document_generation(template: str, variables: Dict[str, Any] | None = None) -> str:
    variables = variables or {}
    try:
        return template.format(**variables)
    except Exception:
        # if formatting fails, just return the template
        return template
