from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.job import JobStatus


class JobSummary(BaseModel):
    id: UUID
    status: JobStatus
    model: str
    file_count: int
    total_pages: int
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class JobOut(JobSummary):
    options: dict
    error_message: str | None
    has_markdown: bool
    has_pdf: bool
