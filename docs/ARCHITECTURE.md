# RecallAI — Architecture & Re-implementation Guide

## What the current app does

**Core purpose:** Upload one or more PDF question papers → AI extracts, categorizes by topic, ranks by difficulty → download a formatted PDF of the structured output.

### Processing pipeline (3 steps, all synchronous today)

```
PDF upload(s)
    ↓
[pdf_processor.py] Extract text page-by-page
    - Try native text via PyMuPDF first
    - If text < 50 chars: OCR via Tesseract → EasyOCR fallback
    - Optionally extract embedded images (bytes + metadata)
    - Annotate pages: "Page N", "[Image(s) detected: X]"
    ↓
clean_extracted_text() — collapse excess whitespace
    ↓
Merge all docs: "# filename.pdf\n<text>"
    ↓
Gemini call #1  (temp=0.3, streaming)
    System prompt: pyq_model_system_instructions.txt
    → Structured Markdown
      - ### Topic headings
      - questions sorted Easy → Moderate → Challenging
      - *Tags:* and **Source:** per question
      - #### Frequency Summary tables at end
    ↓
Gemini call #2  (temp=0.2, streaming)
    System prompt: html_response_model_system_instructions.txt
    → Full self-contained HTML (Monokai code blocks, styled h3, hr between questions)
    ↓
Strip markdown code fences from HTML string
    ↓
pdfkit.from_string() → wkhtmltopdf → PDF bytes
    ↓
st.download_button + st.html preview
```

### What the current stack does badly

1. **Monolith** — all logic in one `app.py`, no separation between UI and processing.
2. **Blocking I/O** — AI calls (can take minutes) block the Streamlit thread; the UI just shows a spinner.
3. **No async / no job queue** — two users processing at the same time contend for the same thread.
4. **Hard system dependency** — `wkhtmltopdf` must be installed on the server.
5. **Images are extracted but never sent to Gemini** — only the count annotation goes in the text; the image bytes are unused.
6. **OCR model cold-start** — EasyOCR initializes a 100+ MB model on first page that needs OCR.
7. **API key is stateless** — users paste their key every time; no auth.
8. **Retry logic blocks the server** — `time.sleep(30)` inside a retry loop.

---

## Re-implementation Architecture: Next.js + FastAPI

### High-level diagram

```
Browser (Next.js)
  │
  ├── POST /api/jobs               — upload PDFs + config + Gemini key
  │                                   → returns { job_id }
  │
  ├── GET  /api/jobs/{id}/stream   — SSE stream
  │                                   → progress events: pdf_done | step1_done | step2_done | complete | error
  │
  ├── GET  /api/jobs/{id}/markdown — raw Markdown result
  ├── GET  /api/jobs/{id}/html     — raw HTML result
  └── GET  /api/jobs/{id}/pdf      — PDF file download
```

---

### Backend: FastAPI

**Project layout**

```
backend/
├── main.py                  # FastAPI app, CORS, routers
├── routers/
│   └── jobs.py              # POST /jobs, GET /jobs/{id}/stream, /markdown, /html, /pdf
├── services/
│   ├── pdf_extractor.py     # PyMuPDF text+image extraction, OCR fallback
│   ├── ai_pipeline.py       # Two-step Gemini calls (async streaming)
│   └── html_to_pdf.py       # Playwright-based PDF generation
├── models/
│   └── job.py               # Job state dataclass + in-memory store (or Redis)
├── templates/
│   ├── pyq_system_prompt.txt
│   └── html_system_prompt.txt
└── requirements.txt
```

**Job lifecycle**

```python
# POST /api/jobs
# Accepts: multipart/form-data
#   files[]        — one or more PDFs
#   model          — gemini model name
#   use_ocr        — bool
#   extract_images — bool
#   gemini_key     — string (never stored to disk)
# Returns: { job_id: uuid, status: "queued" }
```

Jobs run as **FastAPI `BackgroundTask`** (or a dedicated `asyncio.Queue` worker). Each job has a state machine:

```
queued → extracting → analyzing → converting → generating_pdf → done
                                                              ↘ error
```

**SSE stream** pushes one JSON event per state transition:

```json
{ "event": "progress", "step": "analyzing", "message": "Calling Gemini (step 1/2)..." }
{ "event": "progress", "step": "done", "markdown_ready": true, "html_ready": true, "pdf_ready": true }
```

**Key implementation choices**

| Concern | Approach |
|---|---|
| Async Gemini calls | `google-genai` async client, stream chunks into accumulated string |
| Retry with backoff | `tenacity` with `wait_exponential`, no `time.sleep` |
| OCR cold-start | Initialize EasyOCR reader once at worker startup, not per-request |
| PDF generation | Playwright (`page.pdf()`) — no system binary needed; fall back to pdfkit |
| Job storage | In-memory dict for now (results are ephemeral); Redis if multi-worker |
| API key | Passed per-request in header `X-Gemini-Key`, never logged or persisted |
| Images | Extract bytes, base64-encode, pass to Gemini as `Part.from_bytes(image_bytes, mime_type)` alongside text — fixes the current bug where images are described but not seen |

**`services/ai_pipeline.py` structure**

```python
async def run_pipeline(job: Job, gemini_key: str) -> None:
    # Step 1: PYQ analysis
    job.status = "analyzing"
    job.markdown = await call_gemini_streaming(
        prompt=job.extracted_text,
        system_prompt=PYQ_PROMPT,
        model=job.model,
        api_key=gemini_key,
        temperature=0.3,
    )

    # Step 2: HTML conversion
    job.status = "converting"
    raw_html = await call_gemini_streaming(
        prompt=job.markdown,
        system_prompt=HTML_PROMPT,
        model=job.model,
        api_key=gemini_key,
        temperature=0.2,
    )
    job.html = strip_code_fences(raw_html)

    # Step 3: PDF
    job.status = "generating_pdf"
    job.pdf_bytes = await html_to_pdf(job.html)

    job.status = "done"
```

---

### Frontend: Next.js

**Project layout**

```
frontend/
├── app/
│   ├── page.tsx                  # Upload form (home)
│   ├── results/[jobId]/
│   │   └── page.tsx              # SSE progress + results page
│   └── layout.tsx
├── components/
│   ├── UploadForm.tsx            # File input, model selector, OCR toggle, API key field
│   ├── ProgressStepper.tsx       # Visual step tracker driven by SSE events
│   ├── ResultTabs.tsx            # Tabs: Preview | Markdown | Download PDF
│   └── HtmlPreview.tsx           # Renders the HTML in a sandboxed iframe
└── lib/
    └── api.ts                    # Typed wrappers: submitJob(), streamJobStatus()
```

**Upload flow**

1. User fills `UploadForm` → `POST /api/jobs` → receives `job_id`
2. Router pushes to `/results/{job_id}`
3. `ProgressStepper` opens SSE connection to `/api/jobs/{job_id}/stream`
4. On `done` event: show `ResultTabs` with Markdown tab, HTML preview (iframe), and "Download PDF" button

**Key decisions**

- SSE (not WebSocket) — one-way progress is sufficient; simpler CORS and no upgrade handshake
- `HtmlPreview` renders in a `<iframe srcdoc={html}>` — isolates AI-generated HTML from the app's styles; no XSS risk
- Gemini API key is held in React state for the session only, sent as a request header, never stored in `localStorage`
- No auth in v1 — key-per-request is sufficient; add NextAuth later if needed

---

### Environment variables

```bash
# backend/.env
ALLOWED_ORIGINS=http://localhost:3000
MAX_UPLOAD_SIZE_MB=50
JOB_TTL_SECONDS=3600       # how long to keep results in memory

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Migration notes

### What to keep from the current implementation

- Both system prompt files — they work well, copy them verbatim
- The OCR fallback chain (Tesseract → EasyOCR) in `pdf_extractor.py`
- The regex `strip_code_fences` logic for cleaning Gemini's HTML output
- The per-file fallback to basic fitz extraction on error
- The model list: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite-preview-06-17`, `gemini-2.0-flash`

### What to fix / improve

- Actually send extracted images to Gemini as image parts (not just count annotations)
- Use `async` throughout — no `time.sleep` in retry logic
- Initialize OCR readers once at startup (not lazily per request)
- Replace wkhtmltopdf with Playwright for PDF generation (no system binary)
- Add proper job cleanup (TTL-based) to prevent memory growth
