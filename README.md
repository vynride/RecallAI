<p align="center">
  <img src="client/app/icon.svg" alt="RecallAI" width="88" height="88" />
</p>

<h1 align="center">RecallAI</h1>

<p align="center">
  <em>Question papers, decoded.</em>
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-2.0.0-ff7759?style=flat-square" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img alt="Celery" src="https://img.shields.io/badge/Celery-5.4-37814A?style=flat-square&logo=celery&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img alt="Gemini" src="https://img.shields.io/badge/Google-Gemini-8E44AD?style=flat-square&logo=google&logoColor=white" />
</p>

---

## Overview

RecallAI processes previous year question papers (PYQs) through a multimodal AI pipeline. Upload one or more exam PDFs, and RecallAI extracts every question, groups them by topic, ranks them by difficulty, and delivers a polished study guide as both Markdown and a styled, downloadable PDF.

---

## Features

| Capability | Details |
|---|---|
| AI analysis | Google Gemini extracts, categorises, and ranks questions by topic and difficulty |
| OCR fallback | Tesseract then EasyOCR for scanned or image-only PDFs |
| Image extraction | Diagrams and figures forwarded directly to Gemini as image bytes |
| Export formats | WeasyPrint-rendered PDF + raw Markdown, both downloadable |
| Real-time progress | Server-sent events (SSE) stream live pipeline status to the browser |
| Background workers | Celery task queue; hung jobs auto-failed after 25 minutes |
| Authentication | Google and GitHub OAuth via Auth.js v5 (next-auth) |
| Bring your own key | Gemini API key stored encrypted per user; sent per-request, never logged |
| Analytics | Self-hosted Umami, private by default |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 · React 19 · Tailwind CSS v4 · Framer Motion |
| Backend | FastAPI 0.115 · SQLAlchemy 2 (async) · Pydantic |
| AI | Google Gemini (BYOK) · PyMuPDF · Tesseract · EasyOCR |
| PDF rendering | markdown2 → WeasyPrint |
| Queue | Celery 5.4 · Redis 7 (broker + result backend + SSE pubsub) |
| Database | PostgreSQL 16 |
| Auth | Auth.js v5 · HS256 JWT server-side proxy |
| Infrastructure | Docker Compose · nginx (TLS, reverse proxy) · Umami |

---

## Prerequisites

- Docker and Docker Compose
- A Google Gemini API key — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Google OAuth app credentials and/or GitHub OAuth app credentials

---

## Local Development

```bash
git clone https://github.com/vynride/RecallAI.git
cd RecallAI
cp .env.example .env          # fill in OAuth secrets and GEMINI_KEY_PEPPER
docker compose up --build
```

`docker-compose.override.yml` is applied automatically. It bind-mounts source directories and enables hot reload for both the Next.js frontend and the FastAPI backend and workers.

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| Umami | http://localhost:3001 |

---

## Production Deployment

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The production override binds all containers to `127.0.0.1` only and applies memory caps. System nginx handles TLS termination and reverse proxying. See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the complete VPS setup guide.

Minimum VPS spec: **2 vCPU / 4 GB RAM / 40 GB SSD**

---

## Environment Variables

Copy `.env.example` and set the following:

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Auth.js signing secret (random string) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth app credentials |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app credentials |
| `GEMINI_KEY_PEPPER` | Server-side pepper for per-user Gemini key encryption |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | PostgreSQL credentials |
| `RECALLAI_DATA_DIR` | Host path for Docker volume bind-mounts (must be a POSIX-compatible filesystem) |
| `UMAMI_APP_SECRET` | Umami analytics secret |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Umami site ID |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | Umami script URL |

---

## Supported Models

| Model | Notes |
|---|---|
| `gemini-3.1-pro-preview` | Highest accuracy, slowest |
| `gemini-3-flash-preview` | Fast and balanced — **default** |
| `gemini-3.1-flash-lite-preview` | Lightweight |

---

## Output Format

Each processed job produces a structured document with:

- Questions grouped by topic, sorted from Easy through Moderate to Challenging
- Preserved formatting: code blocks, pseudo-code, equations, and image placeholders
- Per-question tags: difficulty pill and question-type pill
- Frequency summary tables by topic, difficulty, and type
- Downloadable styled PDF and raw Markdown

---

## Project Layout

```
RecallAI/
├── backend/
│   └── app/
│       ├── api/            # FastAPI routes
│       ├── models/         # SQLAlchemy models
│       ├── services/       # ai_pipeline, pdf_extractor, markdown_to_pdf, key_crypto
│       ├── templates/      # Gemini system prompt and PDF stylesheet
│       └── workers/        # Celery tasks and beat scheduler
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

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system diagram, request flow, API reference, auth model
- [Deployment](docs/DEPLOY.md) — full VPS setup with nginx, TLS, and Docker Compose
- [Plan](docs/PLAN.md) — roadmap and known gaps
