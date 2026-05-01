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

# ── Inline SVGs ───────────────────────────────────────────────────────────────

_LOGO_SVG = (
    '<svg width="64" height="64" viewBox="0 0 48 48" fill="none"'
    ' xmlns="http://www.w3.org/2000/svg">'
    '<rect width="48" height="48" rx="11" fill="#ff7759"/>'
    '<path d="M24 12 A12 12 0 1 1 12 24"'
    ' stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>'
    '<polygon points="8,21 12,27 16,21" fill="white"/>'
    '<circle cx="24" cy="24" r="3.5" fill="white"/>'
    '</svg>'
)

_ICON_GITHUB = (
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="#003c33"'
    ' xmlns="http://www.w3.org/2000/svg">'
    '<path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387'
    '.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416'
    '-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729'
    ' 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997'
    '.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931'
    ' 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0'
    ' 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138'
    ' 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118'
    ' 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921'
    '.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576'
    'C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>'
    '</svg>'
)

_ICON_X = (
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="#003c33"'
    ' xmlns="http://www.w3.org/2000/svg">'
    '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231'
    '-5.402 6.231H2.742l7.736-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63z'
    'm-1.161 17.52h1.833L7.084 4.126H5.117z"/>'
    '</svg>'
)

_ICON_MAIL = (
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"'
    ' stroke="#003c33" stroke-width="2" stroke-linecap="round"'
    ' stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">'
    '<rect x="2" y="4" width="20" height="16" rx="2"/>'
    '<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'
    '</svg>'
)

_ICON_GLOBE = (
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"'
    ' stroke="#75758a" stroke-width="2" stroke-linecap="round"'
    ' stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">'
    '<circle cx="12" cy="12" r="10"/>'
    '<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10'
    ' 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
    '</svg>'
)

_STAR_SVG = (
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="#ff7759"'
    ' xmlns="http://www.w3.org/2000/svg">'
    '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77'
    'l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>'
    '</svg>'
)


def _build_cover(title: str) -> str:
    return (
        '<header class="cover">'

        # ── Brand row: logo · name · site URL ──
        '<table class="cover-brand-table"><tr>'
        f'<td class="cover-logo-cell">{_LOGO_SVG}</td>'
        '<td class="cover-brand-cell">'
        '<div class="cover-brand-name">RecallAI</div>'
        '<a href="https://recall-ai.vynride.dev/" class="cover-site-url">'
        f'{_ICON_GLOBE}&nbsp;recall-ai.vynride.dev'
        '</a>'
        '</td>'
        '</tr></table>'

        # ── Title ──
        f'<h1 class="cover-title">{escape(title)}</h1>'

        # ── Attribution block ──
        '<div class="cover-attribution">'
        '<div class="cover-made-by">Made by <strong>Vivian Demello</strong></div>'

        # Social links
        '<table class="cover-links-table"><tr>'

        '<td class="cover-link-cell">'
        '<a href="https://github.com/vynride/" class="cover-link">'
        f'<table><tr><td class="cover-icon-cell">{_ICON_GITHUB}</td>'
        '<td class="cover-link-text">github.com/vynride</td></tr></table>'
        '</a></td>'

        '<td class="cover-link-cell">'
        '<a href="https://x.com/vynride" class="cover-link">'
        f'<table><tr><td class="cover-icon-cell">{_ICON_X}</td>'
        '<td class="cover-link-text">x.com/vynride</td></tr></table>'
        '</a></td>'

        '<td class="cover-link-cell">'
        '<a href="mailto:vynride@gmail.com" class="cover-link">'
        f'<table><tr><td class="cover-icon-cell">{_ICON_MAIL}</td>'
        '<td class="cover-link-text">vynride@gmail.com</td></tr></table>'
        '</a></td>'

        '</tr></table>'

        # Star CTA
        '<div class="cover-star">'
        f'{_STAR_SVG}&nbsp;'
        '<a href="https://github.com/vynride/RecallAI/" class="cover-star-link">'
        'Like it? Drop a Star - github.com/vynride/RecallAI'
        '</a>'
        '</div>'

        '</div>'  # end attribution
        '</header>'
    )


def _colorize_tags(md: str) -> str:
    """Wrap `*Tags: Easy, Conceptual*` into `<span class="tag easy">…</span>`."""
    def repl(match: re.Match[str]) -> str:
        difficulty = match.group(1).strip()
        qtype = match.group(2).strip()
        cls = difficulty.lower()
        return (
            f'<span class="tag {cls}">{escape(difficulty)}</span>'
            f'<span class="tag type">{escape(qtype)}</span>'
        )
    return _TAG_RE.sub(repl, md)


def markdown_to_pdf(md: str, *, title: str = "RecallAI: Question papers, decoded.") -> bytes:
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
        f"</head><body>{_build_cover(title)}{body}</body></html>"
    )
    return HTML(string=doc).write_pdf()
