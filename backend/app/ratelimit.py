"""Shared slowapi limiter.

Lives in its own module so both `main` (middleware/handler) and the routers
(per-endpoint `@limiter.limit(...)` decorators) can import it without a cycle.
"""

from __future__ import annotations

from fastapi import Request
from jose import JWTError, jwt
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import SETTINGS


def rate_limit_key(request: Request) -> str:
    """Key rate limits by the authenticated user.

    Runs inside SlowAPIMiddleware — before route dependencies — so we cannot read
    `request.state.user_id` (it is only set later by `current_user`). Instead we
    verify the bearer JWT here and key on its `sub`, falling back to the client IP
    for unauthenticated requests. Verification (not just decode) prevents a forged
    `sub` from evading or sharing another user's bucket.
    """
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(
                token,
                SETTINGS.nextauth_secret,
                algorithms=[SETTINGS.jwt_algorithm],
                options={"verify_aud": False},
            )
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except JWTError:
            pass
    return get_remote_address(request)


limiter = Limiter(
    key_func=rate_limit_key,
    default_limits=[SETTINGS.rate_limit_default],
    storage_uri=SETTINGS.redis_url,
)
