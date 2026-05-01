# RecallAI

AI-powered Previous Year Question Paper (PYQ) analyzer. Upload past exam PDFs and get back a structured, topic-sorted, difficulty-ranked study guide — as both Markdown and a styled PDF.

**Stack:** Next.js 16 · FastAPI · Celery · PostgreSQL · Redis · WeasyPrint · Docker Compose · Umami

---

## Features

- **AI analysis** via Google Gemini — extracts, categorizes, and ranks questions
- **OCR fallback** for scanned PDFs (EasyOCR + Tesseract)
- **Image extraction** preserves diagrams and figures
- **PDF + Markdown export** — WeasyPrint-rendered, styled output
- **Real-time progress** via SSE streaming
- **Background workers** — Celery queue + beat scheduler (auto-fails hung tasks after 25 min)
- **Auth** — Google and GitHub OAuth via Auth.js (next-auth v5)
- **Encrypted API keys** — Gemini key stored encrypted per user, sent per-request
- **Analytics** — self-hosted Umami

## Prerequisites

- Docker + Docker Compose
- Google Gemini API key — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Google and/or GitHub OAuth app credentials

## Run locally

```bash
git clone https://github.com/vynride/RecallAI.git
cd RecallAI
cp .env.example .env   # fill in OAuth secrets + Gemini pepper
docker compose up --build
```

`docker-compose.override.yml` is applied automatically — it bind-mounts source directories and enables hot reload for both the Next.js frontend and the FastAPI backend/workers.

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000      |
| API      | http://localhost:8000      |
| Umami    | http://localhost:3001      |

## Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The prod override binds all containers to `127.0.0.1` only and adds resource caps. System nginx (not a container) handles TLS and reverse proxying — see `docs/DEPLOY.md` for the full setup.

## Environment variables

Copy `.env.example` and fill in:

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Auth.js secret (random string) |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth app |
| `GITHUB_CLIENT_ID/SECRET` | GitHub OAuth app |
| `GEMINI_KEY_PEPPER` | Server-side pepper for encrypting user API keys |
| `POSTGRES_USER/PASSWORD/DB` | PostgreSQL credentials |
| `RECALLAI_DATA_DIR` | Host path for Docker volume bind-mounts (must be on a POSIX-compatible FS) |
| `UMAMI_APP_SECRET` | Umami analytics secret |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Umami site ID |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | Umami script URL |

## Supported models

| Model | Notes |
|---|---|
| `gemini-3.1-pro-preview` | Highest accuracy, slower |
| `gemini-3-flash-preview` | Fast, balanced — **default** |
| `gemini-3.1-flash-lite-preview` | Lightweight |

## Project layout

```
RecallAI/
├── backend/
│   └── app/
│       ├── api/            # FastAPI routes
│       ├── models/         # SQLAlchemy models
│       ├── services/       # ai_pipeline, pdf_extractor, markdown_to_pdf
│       ├── templates/      # Gemini system prompt + PDF stylesheet
│       └── workers/        # Celery tasks + beat scheduler
├── client/
│   ├── app/                # Next.js App Router pages
│   └── components/         # UI components
├── docs/
│   ├── ARCHITECTURE.md     # System design and API reference
│   ├── DEPLOY.md           # VPS deployment guide
│   └── PLAN.md             # Roadmap and known gaps
├── docker-compose.yml          # Base services
├── docker-compose.override.yml # Dev hot-reload (auto-applied)
└── docker-compose.prod.yml     # Production overrides
```

## Output format

Each processed task produces:

- Questions grouped by topic, sorted by difficulty (Easy → Moderate → Challenging)
- Preserved formatting: code blocks, pseudo-code, equations, image placeholders
- Tags: difficulty pill + question type pill per question
- Frequency summary tables (by topic, difficulty, type)
- Downloadable styled PDF + raw Markdown
