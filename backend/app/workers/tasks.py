from __future__ import annotations

import asyncio
import logging
import shutil
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import SETTINGS
from app.models import Job, JobStatus
from app.services import ai_pipeline, markdown_to_pdf, pdf_extractor, progress
from app.workers.celery_app import celery

logger = logging.getLogger(__name__)

_engine = create_async_engine(SETTINGS.database_url, pool_pre_ping=True)
_Session = async_sessionmaker(_engine, expire_on_commit=False)

CONCURRENT_KEY = "recallai:user-jobs:{user_id}"


def _emit(job_id: str, **payload) -> None:
    progress.publish(job_id, payload)


async def _run(job_id_str: str, gemini_key: str) -> None:
    job_id = UUID(job_id_str)
    upload_root = SETTINGS.upload_dir / job_id_str
    result_path = SETTINGS.result_dir / f"{job_id_str}.pdf"

    async with _Session() as session:
        job = await session.get(Job, job_id)
        if job is None:
            logger.warning("job %s vanished before run", job_id_str)
            return

        job.status = JobStatus.extracting
        job.started_at = datetime.now(timezone.utc)
        await session.commit()
        _emit(job_id_str, event="progress", step="extracting")

        try:
            extracted = []
            for pdf_file in sorted(upload_root.glob("*.pdf")):
                doc = pdf_extractor.extract_document(
                    pdf_file.read_bytes(),
                    pdf_file.name,
                    use_ocr=job.options.get("use_ocr", True),
                    extract_images=job.options.get("extract_images", True),
                )
                extracted.append(doc)
                _emit(
                    job_id_str,
                    event="progress",
                    step="extracting",
                    file=pdf_file.name,
                    pages=doc.page_count,
                    images=len(doc.images),
                )

            job.total_pages = sum(d.page_count for d in extracted)
            job.status = JobStatus.analyzing
            await session.commit()
            _emit(job_id_str, event="progress", step="analyzing")

            merged_text = pdf_extractor.merge_documents(extracted)
            all_images = [img for d in extracted for img in d.images]

            chunk_bytes = {"n": 0}

            def on_chunk(text: str) -> None:
                chunk_bytes["n"] += len(text)
                _emit(job_id_str, event="progress", step="analyzing", bytes=chunk_bytes["n"])

            markdown = await ai_pipeline.generate_markdown(
                api_key=gemini_key,
                model=job.model,
                extracted_text=merged_text,
                images=all_images,
                on_chunk=on_chunk,
            )

            job.markdown = markdown
            job.status = JobStatus.rendering_pdf
            await session.commit()
            _emit(job_id_str, event="progress", step="rendering_pdf")

            pdf_bytes = await asyncio.to_thread(
                markdown_to_pdf.markdown_to_pdf, markdown, title="RecallAI Question Bank"
            )
            result_path.write_bytes(pdf_bytes)

            job.status = JobStatus.done
            job.completed_at = datetime.now(timezone.utc)
            await session.commit()
            _emit(
                job_id_str,
                event="complete",
                pdf_bytes=len(pdf_bytes),
                markdown_bytes=len(markdown),
            )

        except Exception as exc:
            logger.exception("pipeline failed for %s", job_id_str)
            job.status = JobStatus.error
            job.error_message = f"{type(exc).__name__}: {exc}"
            job.completed_at = datetime.now(timezone.utc)
            await session.commit()
            _emit(job_id_str, event="error", message=str(exc))
        finally:
            progress.sync_client().decr(CONCURRENT_KEY.format(user_id=str(job.owner_id)))


@celery.task(name="app.workers.tasks.run_pipeline")
def run_pipeline(job_id: str, gemini_key: str) -> None:
    asyncio.run(_run(job_id, gemini_key))


@celery.task(name="app.workers.tasks.cleanup_expired_jobs")
def cleanup_expired_jobs() -> None:
    asyncio.run(_cleanup())


async def _cleanup() -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=SETTINGS.job_ttl_hours)
    async with _Session() as session:
        rows = (
            await session.execute(
                select(Job).where(Job.created_at < cutoff)
            )
        ).scalars().all()
        for job in rows:
            shutil.rmtree(SETTINGS.upload_dir / str(job.id), ignore_errors=True)
            pdf = SETTINGS.result_dir / f"{job.id}.pdf"
            if pdf.exists():
                pdf.unlink()
            await session.delete(job)
        await session.commit()
        if rows:
            logger.info("evicted %d expired jobs", len(rows))


def reserve_slot(user_id: str) -> bool:
    """Returns True if the user is under their concurrent-job cap."""
    redis = progress.sync_client()
    new_value = redis.incr(CONCURRENT_KEY.format(user_id=user_id))
    if new_value > SETTINGS.rate_limit_concurrent_jobs:
        redis.decr(CONCURRENT_KEY.format(user_id=user_id))
        return False
    redis.expire(CONCURRENT_KEY.format(user_id=user_id), 60 * 60 * 6)
    return True


def release_slot(user_id: str) -> None:
    progress.sync_client().decr(CONCURRENT_KEY.format(user_id=user_id))
