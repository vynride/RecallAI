# RecallAI - PYQ Analyzer

An AI-powered tool that analyzes Previous Year Question Papers (PYQs) and transforms them into structured, organized study materials. RecallAI extracts questions from PDF documents, categorizes them by topic, ranks them by difficulty, and generates beautifully formatted outputs ready for export.

Stack: **Next.js** frontend, **FastAPI + Celery** backend, **Postgres + Redis**, deployed via Docker Compose with **nginx** and **Umami** analytics. See [`PLAN.md`](PLAN.md) for the architecture and [`ARCHITECTURE.md`](ARCHITECTURE.md) for design notes.

## Features

- **AI-powered question extraction** using Google Gemini
- **OCR fallback** for scanned PDFs (EasyOCR + Tesseract)
- **Image extraction** preserves diagrams from question papers
- **Topic categorization** by curriculum terminology
- **Difficulty ranking** (Easy / Moderate / Challenging) within each topic
- **PDF export** via WeasyPrint
- **Background processing** via Celery workers with progress streaming over SSE
- **Analytics** via self-hosted Umami

## Prerequisites

- Docker + Docker Compose
- Google Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

## Run locally

```bash
git clone https://github.com/vynride/RecallAI.git
cd RecallAI
cp .env.example .env   # fill in OAuth + secrets
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Umami: `http://localhost:3000/umami` (via nginx in prod compose)

For production, use `docker-compose.prod.yml` which fronts everything with nginx.

## Project layout

```
RecallAI/
├── backend/        # FastAPI + Celery (workers, beat, API)
├── client/         # Next.js 16 frontend
├── infra/          # nginx + deployment config
├── docker-compose.yml
├── docker-compose.prod.yml
├── PLAN.md
└── ARCHITECTURE.md
```

## Supported models

- `gemini-2.5-flash` — fast, balanced
- `gemini-2.5-pro` — higher accuracy, slower
- `gemini-2.5-flash-lite-preview-06-17` — lightweight
- `gemini-2.0-flash` — older stable

## Output

Structured Markdown (and PDF) containing:
- Questions grouped by topic, ranked by difficulty
- Preserved formatting (code blocks, special characters)
- Image placeholders for diagrams from the source PDFs
- Frequency summary statistics
