from celery import Celery
from celery.signals import worker_process_init

from app.config import SETTINGS

celery = Celery(
    "recallai",
    broker=SETTINGS.celery_broker_url,
    backend=SETTINGS.celery_result_backend,
    include=["app.workers.tasks"],
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_default_queue="pipeline",
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


@worker_process_init.connect
def _warm_ocr(**_: object) -> None:
    from app.services.pdf_extractor import init_ocr_readers

    init_ocr_readers()


celery.conf.beat_schedule = {
    "ttl-cleanup": {
        "task": "app.workers.tasks.cleanup_expired_jobs",
        "schedule": 60 * 30,  # every 30 min
    },
    "fail-hung-jobs": {
        "task": "app.workers.tasks.fail_hung_jobs",
        "schedule": 60 * 5,  # every 5 min
    },
}
