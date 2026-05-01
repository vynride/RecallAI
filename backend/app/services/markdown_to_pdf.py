"""Markdown → styled HTML → PDF.

Replaces the v1 (Gemini-call-#2 + wkhtmltopdf) pipeline with a deterministic
WeasyPrint render. The CSS lives next to this module so it can be tweaked
without touching code. Color classes (.easy/.moderate/.challenging) are
emitted by the system prompt's `*Tags:*` line.
"""

from __future__ import annotations

import re
from html import escape
from pathlib import Path

import markdown2
from weasyprint import HTML

PDF_CSS = (Path(__file__).resolve().parent.parent / "templates" / "pdf_styles.css").read_text()

_TAG_RE = re.compile(r"\*Tags:\s*(Easy|Moderate|Challenging),\s*([^\*]+)\*", re.IGNORECASE)


def _colorize_tags(md: str) -> str:
    """Wrap `*Tags: Easy, Conceptual*` into `<span class="tag easy">…</span>`.

    The model is told to emit the line as-is; we transform it to color-code
    difficulty without forcing the model to remember HTML.
    """

    def repl(match: re.Match[str]) -> str:
        difficulty = match.group(1).strip()
        qtype = match.group(2).strip()
        cls = difficulty.lower()
        return (
            f'<span class="tag {cls}">{escape(difficulty)}</span>'
            f'<span class="tag type">{escape(qtype)}</span>'
        )

    return _TAG_RE.sub(repl, md)


def markdown_to_pdf(md: str, *, title: str = "RecallAI Report") -> bytes:
    md = _colorize_tags(md)
    body = markdown2.markdown(
        md,
        extras=[
            "fenced-code-blocks",
            "tables",
            "header-ids",
            "strike",
            "task_list",
            "code-friendly",
            "footnotes",
            "cuddled-lists",
        ],
    )
    doc = (
        "<!DOCTYPE html><html><head>"
        '<meta charset="utf-8">'
        f"<title>{escape(title)}</title>"
        f"<style>{PDF_CSS}</style>"
        f'</head><body><header class="cover">'
        f'<div class="brand">RecallAI</div>'
        f'<h1 class="cover-title">{escape(title)}</h1>'
        f'</header>{body}</body></html>'
    )
    return HTML(string=doc).write_pdf()
