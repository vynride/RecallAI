# RecallAI — v2 Revamp Plan

> Companion to `ARCHITECTURE.md` (high-level system) and `client/DESIGN.md` (Cohere visual system). This document covers the **what we are building, in what order, and with what dependencies** for the v2 revamp.

---

## 1. Goals

Replace the Streamlit monolith with a production-grade two-tier system:

- **Frontend:** Next.js 16 (App Router, React 19) — landing page, OAuth, dashboard.
- **Backend:** FastAPI on Uvicorn + Celery workers behind Redis.
- **Deployment:** Docker Compose on a single custom VPS, sized for ~500 active users.
- **AI:** Bring-Your-Own-Key (BYOK) Gemini, latest 2.5 family, never persisted server-side.
- **Analytics:** Self-hosted Umami for first-party usage tracking.
- **PDF generation:** Markdown → styled HTML → WeasyPrint, replacing the wkhtmltopdf/Playwright path with a pure-Python pipeline that produces interactive, color-coded, "pretty" PDFs (the same approach used in Claude web's PDF skill).

Non-goals for v2: multi-tenant orgs, billing, paid plans, mobile apps.

---

## 2. Capacity assumptions (~500 users)

| Dimension | Assumption | Implication |
|---|---|---|
| Concurrent uploads | ≤ 20 | Single Celery worker pool (concurrency 4–6) is enough; scale by adding worker replicas. |
| Avg job duration | 30 s – 4 min (depends on PDF size + model) | Must be async; SSE for progress. |
| Peak storage | Ephemeral PDF results (TTL 24h) + persistent user metadata | Postgres for users/jobs metadata, Redis for queue + result cache, local volume for in-flight files. |
| Egress | Mostly Gemini API + small PDF downloads | No CDN required for v2; nginx in front of frontend handles TLS. |
| VPS sizing | 4 vCPU / 8 GB RAM / 80 GB SSD as a baseline | Tesseract + EasyOCR are the memory hogs — pin worker concurrency accordingly. |

---

## 3. Architecture (target)

```
┌──────────────────────────────────────────────────────────────────────┐
│        nginx (TLS via certbot, reverse proxy, per-IP rate limits)    │
└─────────────┬────────────────────────────────┬───────────────────────┘
              │                                │
              ▼                                ▼
       ┌─────────────┐                 ┌─────────────────┐
       │  Next.js    │  ── /api/auth ─►│  NextAuth       │
       │  (frontend) │                 │  (Google+GitHub)│
       └──────┬──────┘                 └─────────────────┘
              │  fetch / SSE
              ▼
       ┌─────────────────────┐         ┌─────────────────┐
       │  FastAPI (uvicorn)  │ ──────► │  Postgres       │ users, jobs metadata
       │  - REST + SSE       │         └─────────────────┘
       │  - JWT verify       │         ┌─────────────────┐
       │  - rate limit       │ ──────► │  Redis          │ Celery broker + result store
       │  - enqueue tasks    │         │                 │ + pubsub + rate-limit counters
       └──────────┬──────────┘         └─────────────────┘
                  │ Celery
                  ▼
       ┌─────────────────────┐
       │  Celery worker(s)   │ ──► Gemini API (BYOK, per-request)
       │  - PDF extract      │ ──► WeasyPrint → PDF
       │  - 2-step AI pipe   │
       │  - publish progress │
       └─────────────────────┘

       ┌─────────────────┐    ┌─────────────────┐
       │  Umami          │ ──►│  Umami Postgres │
       └─────────────────┘    └─────────────────┘
```

---

## 4. Repository layout (target)

```
RecallAI/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── PLAN.md
├── ARCHITECTURE.md
├── README.md
│
├── backend/
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, lifespan
│   │   ├── config.py               # pydantic-settings, env loading
│   │   ├── deps.py                 # auth dep (JWT verify), db session
│   │   ├── db.py                   # SQLAlchemy 2.x async engine
│   │   ├── models/                 # User, Job, Usage
│   │   ├── schemas/                # pydantic request/response
│   │   ├── routers/
│   │   │   ├── jobs.py             # POST /jobs, GET /jobs/{id}, /stream, /pdf, /md
│   │   │   ├── auth.py             # /me, NextAuth JWT verify endpoint
│   │   │   └── usage.py            # per-user usage stats
│   │   ├── services/
│   │   │   ├── pdf_extractor.py    # PyMuPDF + Tesseract/EasyOCR fallback
│   │   │   ├── ai_pipeline.py      # 2-step Gemini calls (async streaming)
│   │   │   ├── markdown_to_pdf.py  # markdown2 → styled HTML → WeasyPrint
│   │   │   └── progress.py         # publish/subscribe via Redis pubsub
│   │   ├── workers/
│   │   │   ├── celery_app.py       # Celery factory, broker = redis
│   │   │   └── tasks.py            # @app.task run_pipeline(job_id, ...)
│   │   └── templates/
│   │       ├── pyq_system_prompt.txt        (copied verbatim)
│   │       ├── html_system_prompt.txt       (kept, but secondary)
│   │       └── pdf_styles.css               (Cohere-themed WeasyPrint CSS)
│   └── alembic/                    # migrations
│
├── client/                          # Next.js 16 (already scaffolded)
│   ├── AGENTS.md                   # ⚠ "This is NOT the Next.js you know"
│   ├── DESIGN.md                   # Cohere design system
│   ├── Dockerfile
│   ├── app/
│   │   ├── layout.tsx              # Root layout, fonts, Umami script
│   │   ├── page.tsx                # Landing
│   │   ├── (marketing)/            # Future marketing routes
│   │   ├── (auth)/
│   │   │   ├── signin/page.tsx
│   │   │   └── error/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # Auth-gated shell
│   │   │   ├── page.tsx            # Upload + history
│   │   │   ├── jobs/[id]/page.tsx  # Live progress + result
│   │   │   └── settings/page.tsx   # BYOK key entry, default model
│   │   └── api/
│   │       └── auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── landing/                # Hero, FeatureBands, TrustStrip, CTA, Footer
│   │   ├── dashboard/              # UploadDropzone, JobCard, ProgressStepper, ResultTabs
│   │   ├── ui/                     # Button, Pill, Chip, Card primitives (Cohere tokens)
│   │   └── motion/                 # Framer Motion wrappers for microinteractions
│   ├── lib/
│   │   ├── api.ts                  # typed fetch wrappers
│   │   ├── auth.ts                 # next-auth config
│   │   ├── sse.ts                  # SSE hook
│   │   └── umami.ts                # event helpers
│   └── styles/
│       └── tokens.css              # CSS variables from DESIGN.md
│
├── infra/
│   ├── nginx/
│   │   ├── nginx.conf              # base + per-IP rate-limit zones
│   │   └── conf.d/recallai.conf    # vhost: TLS, /api proxy (SSE buffering off)
│   ├── umami/                      # Umami compose snippet + volume
│   └── postgres/init.sql
│
└── (legacy, kept until cutover)
    ├── app.py                      # current Streamlit app — DELETE post-cutover
    ├── utils/                      # extract logic gets ported to backend/services
    └── templates/                  # prompts get copied into backend/app/templates
```

---

## 5. Backend (FastAPI + Celery)

### 5.1 Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/jobs` | required | Create job: multipart upload + config + `X-Gemini-Key` header → `{ job_id }` |
| `GET` | `/api/jobs` | required | List current user's jobs (paginated) |
| `GET` | `/api/jobs/{id}` | required | Job metadata + status |
| `GET` | `/api/jobs/{id}/stream` | required | SSE: `progress`, `step_done`, `complete`, `error` |
| `GET` | `/api/jobs/{id}/markdown` | required | Raw Markdown |
| `GET` | `/api/jobs/{id}/pdf` | required | Final styled PDF |
| `DELETE` | `/api/jobs/{id}` | required | Remove job + artifacts |
| `GET` | `/api/me` | required | Current user (mirror of NextAuth session) |
| `GET` | `/api/usage` | required | Per-user counts (jobs, pages, tokens) |
| `GET` | `/api/health` | public | Liveness for nginx |

### 5.2 Rate limiting (simple, two layers)

Two-layer defence — neither tries to be perfect, both are easy to reason about:

1. **nginx (per-IP, edge)** — `limit_req_zone` keyed by `$binary_remote_addr`:
   - `api` zone: **30 req/s** burst 60, applied to `/api/`.
   - `upload` zone: **5 req/min** applied to `POST /api/jobs`.
   - `auth` zone: **10 req/min** applied to `/api/auth/`.
   Returns `429` with a `Retry-After` header on overflow.

2. **FastAPI (per-user, app)** — `slowapi` middleware backed by Redis, keyed by JWT `sub`:
   - **60 req/min** default for any authenticated route.
   - **20 jobs/hour** for `POST /api/jobs`.
   - **2 concurrent jobs** per user (a Redis `INCR`/`DECR` counter in `tasks.run_pipeline`, not slowapi).

Anonymous endpoints (`/api/health`) are excluded. Limits are configured via env (`RATE_LIMIT_*`) so we can tune without redeploying nginx.

### 5.3 Auth model

- NextAuth issues a JWT (HS256) signed with a shared `NEXTAUTH_SECRET`.
- FastAPI verifies that token via `python-jose`; on first hit it upserts the user row keyed by `(provider, sub)`.
- Gemini API key is **never stored** in Postgres. Two paths:
  1. **Per-request** (default): user pastes key in dashboard → kept in encrypted browser storage (WebCrypto + non-extractable key) → sent in `X-Gemini-Key` header per job.
  2. **Optional remembered key**: encrypted with a per-user key derived from `sub + server pepper`, stored in Postgres only if the user explicitly opts in.

### 5.4 Job lifecycle

```
POST /api/jobs
  ├─ validate files, size, mime
  ├─ persist Job row (status=queued, owner_id, model, options)
  ├─ store uploaded PDFs in /var/recallai/uploads/{job_id}/
  ├─ Celery: tasks.run_pipeline.delay(job_id, gemini_key)   # key passed as task arg, never logged
  └─ return { job_id }

worker (tasks.run_pipeline):
  state: extracting    → progress events per file
  state: analyzing     → Gemini call #1 (markdown), stream chunks → publish to redis pubsub
  state: rendering_pdf → markdown → HTML → WeasyPrint → write /var/recallai/results/{job_id}.pdf
  state: done          → final event

GET /api/jobs/{id}/stream
  └─ subscribe to redis channel `job:{id}` → forward as SSE
```

Key implementation choices:

- **Async Gemini**: `google-genai` async client; stream chunks accumulated and published as `progress` events with byte counts.
- **Retry**: `tenacity` with `wait_exponential`, no `time.sleep`.
- **OCR cold-start**: EasyOCR reader instantiated once at worker boot via Celery `worker_process_init` signal.
- **Image inputs**: extracted image bytes are passed to Gemini as `Part.from_bytes(mime_type=...)` — fixes the v1 bug where images were counted but never seen.
- **TTL cleanup**: a Celery beat task evicts jobs older than `JOB_TTL_HOURS` (default 24) and deletes their files.

### 5.5 Markdown → Pretty PDF (replaces step 2 + wkhtmltopdf)

The v1 pipeline used a second Gemini call to convert markdown to HTML, then wkhtmltopdf. v2 collapses this into a deterministic, themed renderer.

```python
# backend/app/services/markdown_to_pdf.py
import markdown2
from weasyprint import HTML, CSS

PDF_CSS = (TEMPLATES_DIR / "pdf_styles.css").read_text()

def markdown_to_pdf(md: str, *, title: str) -> bytes:
    html_body = markdown2.markdown(
        md,
        extras=[
            "fenced-code-blocks",
            "tables",
            "header-ids",
            "strike",
            "task_list",
            "code-friendly",
            "footnotes",
        ],
    )
    doc = f"""<!DOCTYPE html>
    <html><head>
      <meta charset="utf-8">
      <title>{title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
      <style>{PDF_CSS}</style>
    </head><body>{html_body}</body></html>"""
    return HTML(string=doc).write_pdf()
```

`pdf_styles.css` mirrors the Cohere design tokens (Cohere-Black `#17171c`, Deep Green `#003c33`, Coral `#ff7759`, hairline rules, mono labels) and supplies:

- `@page { margin: 2cm 2.5cm; @bottom-right { content: counter(page); } }`
- Topic headings with a 4px coral accent bar (`h2::before`).
- Difficulty chips by class (`.easy`, `.moderate`, `.challenging`) — the system prompt is updated to wrap each question's tag line in a span with the right class.
- Monokai-style `pre code` blocks (preserves the v1 visual language).
- Tables with deep-green headers and zebra-striped rows for the Frequency Summary.
- Blockquotes with a left coral border for "Source:" callouts.

System prompt update: `pyq_model_system_instructions.txt` is amended to emit difficulty as `*Difficulty:* <span class="moderate">Moderate</span>` so the CSS can colorize without a second model call.

### 5.6 Celery topology

- One broker: Redis db 0.
- One result backend: Redis db 1.
- One default queue: `pipeline`.
- Beat for TTL sweeps + Umami event flush (if we batch).
- Worker concurrency = `CELERY_CONCURRENCY` (default 4). Memory budget per worker ≈ 1.2 GB once OCR is loaded — keep replicas single-process if RAM-bound.

---

## 6. Frontend (Next.js 16)

> ⚠ `client/AGENTS.md` is explicit: **Next.js 16 has breaking changes from training data.** Before writing any route/handler/cache/middleware code, the implementer must read the relevant guide under `client/node_modules/next/dist/docs/` and follow current conventions (App Router, async params, the post-15 caching defaults, etc.). Do not assume Next 14/15 patterns still apply.

### 6.1 Routes

| Route | Auth | Purpose |
|---|---|---|
| `/` | public | Landing — hero, capability bands, trust strip, CTA, footer |
| `/signin` | public | OAuth provider buttons (Google, GitHub) |
| `/dashboard` | required | Upload dropzone + recent jobs list |
| `/dashboard/jobs/[id]` | required | Live SSE progress + ResultTabs (Markdown / PDF preview / Download) |
| `/dashboard/settings` | required | BYOK Gemini key, default model, "remember key" toggle |
| `/api/auth/[...nextauth]` | — | NextAuth handler |

### 6.2 Auth (NextAuth)

- Providers: Google, GitHub.
- Strategy: JWT (no DB session — backend is the source of truth for user metadata).
- Callbacks: forward `provider`, `sub`, `email`, `name`, `picture` into the token; expose via `useSession()` and forward as `Authorization: Bearer <jwt>` to FastAPI.
- Sign-in screen uses `button-primary` (near-black pill) for Google, `button-pill-outline` for GitHub, both with provider glyphs.
- Error page covers the standard NextAuth error codes (`OAuthAccountNotLinked`, etc.) with Cohere-restrained styling.

### 6.3 Landing page (microinteractions)

The landing page must feel like Cohere: monumental headline, white canvas, one dark feature band, restrained color, microinteractions instead of decoration. Microinteractions are implemented with **Framer Motion** + CSS transitions; nothing should animate on a continuous loop except the hero subtle gradient.

Sections (top to bottom):

1. **Announcement bar** (`button-pill-outline`-styled close): "BYOK Gemini · self-hosted · open source" — fade-in on mount.
2. **Nav**: logo left, links centered (Product, Pricing(N/A in v2 → "How it works"), Docs), "Sign in" right. Underline-on-hover with `transform: translateY` micro-shift.
3. **Hero**: hero-display headline ("Question papers, decoded."), supporting body, primary pill "Open Dashboard" (or "Get started" when signed out) + secondary text link "See it run". Headline letters stagger-in (Framer Motion `staggerChildren: 0.04`); the right-side `agent-console-card` mock streams a fake markdown response token-by-token to telegraph the real UX.
4. **Trust-logo strip**: monochrome glyphs of Gemini/Tesseract/PyMuPDF/WeasyPrint as the "powered by" row.
5. **Capability cards** (3-col): "Native + OCR extraction", "Topic + difficulty ranking", "Pretty PDFs you can share". Each card lifts 2px on hover and reveals a thin coral underline.
6. **Dark feature band** (`#003c33`): the upload→process→download flow as a 3-step diagram. Steps animate sequentially when scrolled into view (IntersectionObserver + `whileInView`).
7. **PDF showcase**: a stack of two rounded media cards (22px radius) showing a sample input PDF page next to its colorized output — hover scrubs between input/output.
8. **CTA band** with pale-blue wash and the same primary pill.
9. **Footer**: dark, with the "AI moves fast" coral mono label, newsletter input (placeholder only in v2), legal microcopy.

Microinteraction inventory (use sparingly, all `prefers-reduced-motion` aware):

- Stagger-in headline.
- Hero console fake-typing loop (pause on hover).
- Card hover lift + coral underline reveal.
- IntersectionObserver-driven section reveals (`opacity: 0 → 1`, `y: 12 → 0`, 400ms).
- Primary CTA: cursor-tracking radial highlight on hover.
- Sign-in buttons: provider glyph rotates 6° on hover.

### 6.4 Dashboard

- **Upload zone**: drag-and-drop with file count chip, model selector (`gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.0-flash` — kept current via a `MODELS` constant on the backend), OCR toggle, "Use saved key" toggle, "Process" pill button.
- **Recent jobs**: research-table style row list — title left, status pill centered, timestamp right; click row → job page.
- **Job page**: ProgressStepper (queued → extracting → analyzing → rendering → done) driven by SSE, then ResultTabs (Markdown / PDF preview via `<iframe src="/api/jobs/{id}/pdf">` / Download).
- **Settings**: paste Gemini key (masked), default model, "remember encrypted on server" toggle, delete-all-data button.

### 6.5 Design tokens

`client/styles/tokens.css` exposes the DESIGN.md palette/typography as CSS variables; Tailwind v4's `@theme` block consumes them so utility classes like `bg-deep-green`, `text-coral`, `rounded-pill` map directly to the design system. No invented colors.

---

## 7. Analytics (Umami)

- Self-hosted Umami container in the same compose stack with its own Postgres.
- Loaded via the official `<script async data-website-id="...">` snippet, injected from `app/layout.tsx` only in production and only when the user accepts (a slim cookie banner; Umami is cookieless but we still disclose it).
- Track named events via `window.umami.track(name, data)`:
  - `landing_cta_click` (`{location: "hero" | "feature_band" | "footer"}`)
  - `signin_started` / `signin_completed` (`{provider}`)
  - `job_submitted` (`{model, file_count, total_pages, ocr}`)
  - `job_completed` (`{model, duration_ms, pdf_bytes}`)
  - `job_failed` (`{model, step, error_class}`)
  - `pdf_downloaded`
  - `settings_key_saved` / `settings_key_cleared`
- A small `lib/umami.ts` wraps these calls so component code stays clean.

---

## 8. Docker Compose

`docker-compose.yml` (dev) and `docker-compose.prod.yml` (override with nginx + tighter limits). Services:

| Service | Image | Notes |
|---|---|---|
| `nginx` | `nginx:1.27-alpine` | TLS termination (cert volumes from certbot), reverse proxy, per-IP rate-limit zones, SSE buffering disabled for `/api/jobs/*/stream` |
| `frontend` | built from `client/Dockerfile` | `next start`, port 3000 internal |
| `backend` | built from `backend/Dockerfile` | `uvicorn app.main:app --workers 2` |
| `worker` | same image, `celery -A app.workers.celery_app worker -c 4` | scaled with `--scale worker=N` |
| `beat` | same image, `celery -A app.workers.celery_app beat` | TTL sweeps |
| `redis` | `redis:7-alpine` | broker + result + pubsub; AOF on, no exposure |
| `postgres` | `postgres:16` | RecallAI app DB |
| `umami` | `ghcr.io/umami-software/umami:postgresql-latest` | analytics |
| `umami-db` | `postgres:16` | dedicated DB for Umami |

Volumes: `recallai_uploads`, `recallai_results`, `pg_data`, `umami_pg_data`, `redis_data`, `nginx_certs`.

Resource caps in prod compose: backend 1G, worker 2G, postgres 1G, umami 512M, redis 256M.

---

## 9. Environment variables

```bash
# .env (root, consumed by docker compose)
DOMAIN=recallai.example.com
NEXTAUTH_SECRET=...                 # shared with backend for JWT verification
NEXTAUTH_URL=https://recallai.example.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# backend
DATABASE_URL=postgresql+asyncpg://recallai:...@postgres:5432/recallai
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
ALLOWED_ORIGINS=https://recallai.example.com
MAX_UPLOAD_SIZE_MB=50
JOB_TTL_HOURS=24
GEMINI_KEY_PEPPER=...               # server-side pepper for opt-in stored keys
CELERY_CONCURRENCY=4
RATE_LIMIT_DEFAULT=60/minute
RATE_LIMIT_UPLOAD=20/hour
RATE_LIMIT_CONCURRENT_JOBS=2

# frontend
NEXT_PUBLIC_API_URL=https://recallai.example.com/api
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://recallai.example.com/umami/script.js
NEXT_PUBLIC_UMAMI_WEBSITE_ID=...
```

`.env.example` is updated to mirror this list.

---

## 10. Migration / cutover steps

1. Scaffold `backend/` package; port `utils/pdf_processor.py` → `app/services/pdf_extractor.py` (no logic change, just async wrap + module split).
2. Port the Gemini call into `app/services/ai_pipeline.py`; replace the second Gemini call with the new WeasyPrint pipeline; tweak `pyq_model_system_instructions.txt` for difficulty `<span>` classes.
3. Wire Celery + Redis + Postgres locally; verify `POST /api/jobs` → SSE → `/pdf` end-to-end with a CLI script before any frontend exists.
4. Build Cohere token layer in the frontend (`tokens.css`, Tailwind theme, primitive components).
5. Build landing page with microinteractions; ship behind a feature flag at `/v2` first if desired.
6. Wire NextAuth (Google + GitHub) and dashboard upload flow against the live backend.
7. Stand up the docker-compose stack on the VPS with nginx + Umami; route traffic via DNS; issue TLS via certbot into the `nginx_certs` volume.
8. Smoke-test with 5 real users → fix → open to all.
9. Delete `app.py`, the legacy `templates/` (after copying), and the Streamlit deps from `requirements.txt`.

---

## 11. Open questions (decide before step 1)

- **Stored vs. ephemeral keys**: do we ship the "remember encrypted key" feature in v2, or hold it for v2.1? Default plan: ship it, off by default.
- **PDF preview in iframe**: serve via `Content-Disposition: inline` for the preview tab, `attachment` for the download button — confirm with one route + query param vs. two routes.
- **Image inputs**: confirm Gemini token budget when sending all extracted images; may need a per-job size cap.

---

## 12. Out of scope for v2

- Billing, paid tiers, usage limits beyond per-user concurrency cap.
- Multi-tenant orgs / team accounts.
- Mobile apps.
- Background pre-warming of OCR models across hosts (single-VPS deploy doesn't need it).
- Realtime collaborative editing of generated markdown.
