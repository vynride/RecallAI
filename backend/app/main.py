from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.config import SETTINGS
from app.routers import auth, health, jobs


def _rate_limit_key(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    return user_id or get_remote_address(request)


limiter = Limiter(
    key_func=_rate_limit_key,
    default_limits=[SETTINGS.rate_limit_default],
    storage_uri=SETTINGS.redis_url,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="RecallAI", version="2.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in SETTINGS.allowed_origins.split(",") if o.strip()],
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
