from celery import Celery
from app.config import settings

celery = Celery(
    "assign_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-sla-breaches-every-minute": {
            "task": "app.tasks.sla_tasks.check_sla_breaches",
            "schedule": 60.0,
        },
    },
)
