# RecallAI — Architecture

## Overview

RecallAI processes uploaded exam PDFs through an AI pipeline that extracts, categorises, and ranks questions by topic and difficulty, then exports the result as styled Markdown and PDF.

---

## System diagram

```
Browser
  │
  ▼
nginx (system, 80/443)
  ├── /api/auth/      → frontend:3000   (NextAuth — must come before /api/)
  ├── /api/           → backend:8000    (FastAPI)
  ├── /umami/script.js → umami:3001     (tracking script — public)
  ├── /umami/api/send  → umami:3001     (data collection — public)
  └── /              → frontend:3000   (Next.js)

frontend (Next.js)
  └── /api/proxy/[...path]  — server-side proxy that attaches backend JWT

backend (FastAPI)            postgres:5432   — users, jobs
  └── Celery task queue  →   redis:6379/0    — broker
                         →   redis:6379/1    — result backend
                         →   redis:6379/0    — pubsub (SSE progress)
                         →   Gemini API      — AI (BYOK, per-request)

beat scheduler  — fail_hung_jobs (every 5 min)
               — cleanup_expired_jobs (daily)

umami (port 3001, localhost only) — analytics dashboard via SSH tunnel
umami-db (postgres:5432, internal)
```

All Docker containers bind only to `127.0.0.1` in production. System nginx is the sole public-facing process.

---

## Request flow

### Authenticated API call (frontend → backend)

1. Browser calls `frontend/api/proxy/[...path]`
2. Next.js server-side proxy verifies the NextAuth JWT, mints a fresh short-lived HS256 token, and forwards the request to `http://backend:8000/api/...`
3. FastAPI verifies the token, upserts the user row if new, and handles the request

The client-side JS never holds the NextAuth JWT or talks to FastAPI directly.

### Job submission

```
POST /api/jobs  (multipart: files[], model, use_ocr, extract_images, use_saved_key)
  │  optionally: X-Gemini-Key header
  ├─ validate + write PDFs to /var/recallai/uploads/{job_id}/
  ├─ insert Job row (status=queued)
  ├─ reserve concurrent-job slot (Redis INCR, cap = 2/user)
  └─ tasks.run_pipeline.delay(job_id, api_key)  →  returns {job_id}

GET /api/jobs/{id}/stream  (SSE)
  └─ replay snapshot, then subscribe to Redis pubsub channel job:{id}
```

### Pipeline (Celery worker)

```
queued → extracting   PyMuPDF text extraction per file
                       OCR fallback: Tesseract → EasyOCR
                       Image extraction (bytes forwarded to Gemini)
       → analyzing    Gemini call (streaming): raw text + images → Markdown
       → rendering_pdf  markdown_to_pdf: markdown2 → HTML → WeasyPrint → PDF
       → done          result files written, Redis slot released
       → error         on any exception; hung jobs auto-failed at 25 min
```

---

## Backend

**FastAPI** (`backend/app/`)

| Module | Purpose |
|---|---|
| `main.py` | App factory, CORS, rate-limit middleware (slowapi) |
| `routers/jobs.py` | Job CRUD + SSE stream |
| `routers/auth.py` | `/me`, `/me/key` (BYOK key management), `/models` |
| `routers/health.py` | `GET /api/health` |
| `services/pdf_extractor.py` | PyMuPDF + Tesseract/EasyOCR OCR chain |
| `services/ai_pipeline.py` | Async Gemini streaming call |
| `services/markdown_to_pdf.py` | markdown2 → WeasyPrint PDF |
| `services/key_crypto.py` | Per-user Fernet encryption for stored Gemini keys |
| `services/progress.py` | Redis pubsub publish/subscribe for SSE |
| `workers/tasks.py` | `run_pipeline`, `fail_hung_jobs`, `cleanup_expired_jobs` |
| `workers/celery_app.py` | Celery factory |

### API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | public | Liveness probe |
| `GET` | `/api/models` | public | List of supported Gemini models |
| `GET` | `/api/me` | required | Current user profile |
| `PUT` | `/api/me/key` | required | Save encrypted Gemini key + default model |
| `DELETE` | `/api/me/key` | required | Clear saved key |
| `POST` | `/api/jobs` | required | Submit job (multipart) |
| `GET` | `/api/jobs` | required | List user's jobs (last 50) |
| `GET` | `/api/jobs/{id}` | required | Job metadata |
| `GET` | `/api/jobs/{id}/stream` | required | SSE progress stream |
| `GET` | `/api/jobs/{id}/markdown` | required | Raw Markdown output |
| `GET` | `/api/jobs/{id}/pdf` | required | PDF download (`?inline=true` for preview) |
| `DELETE` | `/api/jobs/{id}` | required | Delete job + files |

### Rate limiting

Two layers:

- **nginx (per-IP)**: not yet configured; recommended `limit_req_zone` zones for `/api/` (30 req/s) and `POST /api/jobs` (5 req/min)
- **slowapi (per-user, app-level)**: 60 req/min default · 20 jobs/hour · 2 concurrent jobs/user (Redis INCR counter)

### Auth model

- NextAuth issues HS256 JWTs signed with `NEXTAUTH_SECRET`
- FastAPI's `current_user` dep verifies the forwarded token and upserts the user row keyed by `(provider, sub)`
- Gemini API key two paths:
  - **Per-request**: sent as `X-Gemini-Key` header, never stored
  - **Saved (opt-in)**: encrypted with Fernet using `sub + GEMINI_KEY_PEPPER`, stored in `users.encrypted_gemini_key`

### Beat schedule

| Task | Schedule |
|---|---|
| `fail_hung_jobs` | Every 5 minutes — marks jobs stuck >25 min as error |
| `cleanup_expired_jobs` | Daily — deletes jobs + files older than `JOB_TTL_HOURS` (default 24h) |

---

## Frontend

**Next.js** (`client/`) with App Router.

| Route | Auth | Purpose |
|---|---|---|
| `/` | public | Landing page |
| `/signin` | public | OAuth sign-in (Google, GitHub) |
| `/dashboard` | required | Upload + job history |
| `/dashboard/jobs/[id]` | required | Live SSE progress + result (Markdown / PDF) |
| `/dashboard/settings` | required | BYOK key management, default model |
| `/privacy`, `/terms` | public | Legal pages |
| `/api/auth/[...nextauth]` | — | NextAuth handler (routed to frontend by nginx) |
| `/api/proxy/[...path]` | required | Server-side proxy to FastAPI |

Auth is handled by **Auth.js v5** (next-auth) with `trustHost: true`. Session strategy is JWT (stateless). The `proxy.ts` middleware gates `/dashboard/*` and redirects unauthenticated users to `/signin`.

---

## Supported models

| Model | Notes |
|---|---|
| `gemini-3.1-pro-preview` | Highest accuracy, slowest |
| `gemini-3-flash-preview` | Default — fast, balanced |
| `gemini-3.1-flash-lite-preview` | Lightweight |

---

## Data storage

| Store | Contents |
|---|---|
| PostgreSQL (`recallai` DB) | `users`, `jobs` tables |
| PostgreSQL (`umami` DB) | Umami analytics data (separate instance) |
| Redis db 0 | Celery broker, pubsub channels, concurrent-job counters |
| Redis db 1 | Celery result backend |
| `/var/recallai/uploads/{job_id}/` | Uploaded PDFs (deleted after TTL) |
| `/var/recallai/results/{job_id}.pdf` | Rendered PDF output (deleted after TTL) |

All persistent data lives under `RECALLAI_DATA_DIR` (default `/var/recallai-data`) as Docker bind-mounts on a Linux-native filesystem.

---

## Analytics

Umami is self-hosted in the same Compose stack. The dashboard is **not publicly accessible** — access it via SSH tunnel:

```bash
ssh -L 3001:127.0.0.1:3001 user@vps
# then open http://localhost:3001
```

Only two Umami endpoints are exposed through nginx (exact-match locations):
- `GET /umami/script.js` — tracking script loaded by visitors' browsers
- `POST /umami/api/send` — event collection
