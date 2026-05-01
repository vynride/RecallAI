from collections.abc import AsyncIterator

from fastapi import Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import SETTINGS
from app.db import get_session
from app.models import User


async def db_session() -> AsyncIterator[AsyncSession]:
    async for session in get_session():
        yield session


async def current_user(
    request: Request,
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(db_session),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(
            token,
            SETTINGS.nextauth_secret,
            algorithms=[SETTINGS.jwt_algorithm],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"invalid token: {exc}") from exc

    provider = payload.get("provider")
    subject = payload.get("sub")
    if not provider or not subject:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token missing provider/sub")

    await session.execute(
        insert(User)
        .values(
            provider=provider,
            subject=subject,
            email=payload.get("email"),
            name=payload.get("name"),
            picture=payload.get("picture"),
        )
        .on_conflict_do_nothing(constraint="uq_user_provider_subject")
    )
    await session.commit()

    result = await session.execute(
        select(User).where(User.provider == provider, User.subject == subject)
    )
    user = result.scalar_one()

    request.state.user_id = str(user.id)
    return user


def gemini_key(x_gemini_key: str | None = Header(default=None)) -> str | None:
    return x_gemini_key
