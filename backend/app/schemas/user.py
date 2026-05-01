from uuid import UUID

from pydantic import BaseModel


class UserOut(BaseModel):
    id: UUID
    provider: str
    email: str | None
    name: str | None
    picture: str | None
    has_saved_key: bool
    default_model: str | None

    model_config = {"from_attributes": True}
