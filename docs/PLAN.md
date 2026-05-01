# RecallAI — Roadmap

The v2 revamp (Streamlit → Next.js + FastAPI + Celery) is complete and in production.

---

## Completed

- Next.js 16 frontend (App Router, React 19) — landing, auth, dashboard, job view, settings
- FastAPI backend — job CRUD, SSE streaming, BYOK key management
- Celery workers — async PDF pipeline, hung-job detection, TTL cleanup
- PostgreSQL — users + jobs persistence
- Redis — Celery broker/backend, pubsub for SSE, concurrent-job counters
- Auth.js v5 — Google + GitHub OAuth, JWT strategy
- Per-user encrypted Gemini key storage (Fernet + server pepper)
- WeasyPrint PDF rendering (replaces Streamlit wkhtmltopdf path)
- OCR fallback chain: Tesseract → EasyOCR
- Image extraction — extracted images forwarded to Gemini as multimodal input
- Per-user rate limiting via slowapi (60 req/min, 20 jobs/hr, 2 concurrent)
- Self-hosted Umami analytics (private dashboard, public tracking endpoints only)
- Docker Compose stack with system nginx + Let's Encrypt TLS

---

## Known gaps / next up

- **Markdown preview tab** — result page shows PDF and raw Markdown but no rendered Markdown view in-browser
- **Usage stats endpoint** — `GET /api/usage` (per-user page/job counts) is not yet implemented
- **Delete-all-data button** in settings is a placeholder

---

## Non-goals (unchanged from original scope)

- Multi-tenant orgs / team accounts
- Billing or paid tiers
- Mobile apps
