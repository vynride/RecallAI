from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import GEMINI_MODELS
from app.deps import current_user, db_session
from app.models import User
from app.schemas import UserOut
from app.services import key_crypto

router = APIRouter(tags=["auth"])


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)) -> UserOut:
    return UserOut(
        id=user.id,
        provider=user.provider,
        email=user.email,
        name=user.name,
        picture=user.picture,
        has_saved_key=user.encrypted_gemini_key is not None,
        default_model=user.default_model,
    )


class SaveKeyBody(BaseModel):
    api_key: str
    default_model: str | None = None


@router.put("/me/key")
async def save_key(
    body: SaveKeyBody,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> dict[str, str]:
    if body.default_model and body.default_model not in GEMINI_MODELS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "unknown model")
    user.encrypted_gemini_key = key_crypto.encrypt(body.api_key, user.subject)
    if body.default_model:
        user.default_model = body.default_model
    await session.commit()
    return {"status": "saved"}


@router.delete("/me/key")
async def clear_key(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> dict[str, str]:
    user.encrypted_gemini_key = None
    await session.commit()
    return {"status": "cleared"}


@router.get("/models")
async def models() -> dict[str, list[str]]:
    return {"models": GEMINI_MODELS}
