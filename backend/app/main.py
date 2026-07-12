from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import SETTINGS
from app.ratelimit import limiter
from app.routers import auth, health, jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


_cors_origins = [o.strip() for o in SETTINGS.allowed_origins.split(",") if o.strip()]
# Fail closed: credentialed CORS with a wildcard origin would let any site make
# authenticated cross-origin requests. Starlette reflects the origin in that case.
if "*" in _cors_origins:
    raise RuntimeError("ALLOWED_ORIGINS must be explicit origins, not '*', with credentials enabled")

app = FastAPI(title="RecallAI", version="2.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def _rate_limited(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(status_code=429, content={"detail": f"rate limit exceeded: {exc.detail}"})


app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
