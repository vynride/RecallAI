from __future__ import annotations

import json
from uuid import UUID, uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse, PlainTextResponse, Response
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.config import GEMINI_MODELS, SETTINGS
from app.deps import current_user, db_session
from app.models import Job, JobStatus, User
from app.schemas import JobOut, JobSummary
from app.services import key_crypto, progress
from app.workers import tasks

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _to_summary(job: Job) -> JobSummary:
    return JobSummary.model_validate(job)


def _to_out(job: Job) -> JobOut:
    summary = _to_summary(job).model_dump()
    pdf_path = SETTINGS.result_dir / f"{job.id}.pdf"
    return JobOut(
        **summary,
        options=job.options or {},
        error_message=job.error_message,
        has_markdown=bool(job.markdown),
        has_pdf=pdf_path.exists(),
    )


@router.post("", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
async def create_job(
    request: Request,
    files: list[UploadFile] = File(...),
    model: str = Form(SETTINGS.default_model),
    use_ocr: bool = Form(True),
    extract_images: bool = Form(True),
    use_saved_key: bool = Form(False),
    x_gemini_key: str | None = Header(default=None),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> JobOut:
    if model not in GEMINI_MODELS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "unknown model")
    if not files:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no files uploaded")

    # resolve key (BYOK header > saved-on-server, opt-in)
    api_key: str | None = x_gemini_key
    if not api_key and use_saved_key and user.encrypted_gemini_key:
        api_key = key_crypto.decrypt(user.encrypted_gemini_key, user.subject)
    if not api_key:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "missing Gemini API key")

    if not tasks.reserve_slot(str(user.id)):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"max {SETTINGS.rate_limit_concurrent_jobs} concurrent jobs per user",
        )

    job = Job(
        id=uuid4(),
        owner_id=user.id,
        status=JobStatus.queued,
        model=model,
        options={"use_ocr": use_ocr, "extract_images": extract_images},
    )
    session.add(job)

    job_dir = SETTINGS.upload_dir / str(job.id)
    job_dir.mkdir(parents=True, exist_ok=True)

    max_bytes = SETTINGS.max_upload_size_mb * 1024 * 1024
    written = 0
    file_count = 0
    for upload in files:
        if not (upload.filename or "").lower().endswith(".pdf"):
            tasks.release_slot(str(user.id))
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "only .pdf files accepted")
        contents = await upload.read()
        written += len(contents)
        if written > max_bytes:
            tasks.release_slot(str(user.id))
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "upload too large")
        (job_dir / upload.filename).write_bytes(contents)
        file_count += 1

    job.file_count = file_count
    await session.commit()
    await session.refresh(job)

    tasks.run_pipeline.delay(str(job.id), api_key)
    return _to_out(job)


@router.get("", response_model=list[JobSummary])
async def list_jobs(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    limit: int = 50,
) -> list[JobSummary]:
    rows = (
        await session.execute(
            select(Job).where(Job.owner_id == user.id).order_by(desc(Job.created_at)).limit(limit)
        )
    ).scalars().all()
    return [_to_summary(j) for j in rows]


@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> JobOut:
    job = await session.get(Job, job_id)
    if job is None or job.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not found")
    return _to_out(job)


@router.get("/{job_id}/markdown", response_class=PlainTextResponse)
async def get_markdown(
    job_id: UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> PlainTextResponse:
    job = await session.get(Job, job_id)
    if job is None or job.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not found")
    if not job.markdown:
        raise HTTPException(status.HTTP_409_CONFLICT, "markdown not ready")
    return PlainTextResponse(job.markdown, media_type="text/markdown")


@router.get("/{job_id}/pdf")
async def get_pdf(
    job_id: UUID,
    inline: bool = False,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> Response:
    job = await session.get(Job, job_id)
    if job is None or job.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not found")
    pdf_path = SETTINGS.result_dir / f"{job.id}.pdf"
    if not pdf_path.exists():
        raise HTTPException(status.HTTP_409_CONFLICT, "pdf not ready")
    disposition = "inline" if inline else f'attachment; filename="RecallAI-{str(job.id)[:8]}.pdf"'
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        headers={"Content-Disposition": disposition},
    )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> Response:
    job = await session.get(Job, job_id)
    if job is None or job.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not found")
    pdf = SETTINGS.result_dir / f"{job.id}.pdf"
    if pdf.exists():
        pdf.unlink()
    import shutil

    shutil.rmtree(SETTINGS.upload_dir / str(job.id), ignore_errors=True)
    await session.delete(job)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{job_id}/stream")
async def stream(
    job_id: UUID,
    request: Request,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> EventSourceResponse:
    job = await session.get(Job, job_id)
    if job is None or job.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not found")

    async def event_iter():
        # Replay current state immediately so reloading the page doesn't lose context.
        yield {
            "event": "snapshot",
            "data": json.dumps({"status": job.status.value, "id": str(job.id)}),
        }
        if job.status in {JobStatus.done, JobStatus.error}:
            yield {
                "event": "complete" if job.status == JobStatus.done else "error",
                "data": json.dumps({"message": job.error_message or "ok"}),
            }
            return
        async for payload in progress.subscribe(str(job_id)):
            if await request.is_disconnected():
                break
            yield {"event": payload.get("event", "progress"), "data": json.dumps(payload)}

    return EventSourceResponse(event_iter())
