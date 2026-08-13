import os
from celery import Celery
from kombu import Exchange, Queue
from pegazus_ai.core.config import settings

# Instância principal do Celery
celery_app = Celery(
    "pegazus_tasks",
    broker=settings.RABBITMQ_URL,
    backend=settings.REDIS_URL
)

default_exchange = Exchange("default", type="direct")
dlx_exchange = Exchange(settings.CELERY_DLQ_EXCHANGE, type="direct")

# Suporte a modo síncrono/eager para desenvolvimento local standalone
task_always_eager = os.getenv("CELERY_TASK_ALWAYS_EAGER", "True").lower() == "true"

celery_app.conf.update(
    task_always_eager=task_always_eager,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,  # Confirma a mensagem apenas APÓS o término da execução
    task_acks_on_failure_or_timeout=False,  # 🚩 NECESSÁRIO PARA DLQ: Rejeita a mensagem no broker em falhas após retries
    task_reject_on_worker_lost=True,
    task_queues=[
        Queue(
            settings.CELERY_TASK_QUEUE,
            exchange=default_exchange,
            routing_key=settings.CELERY_TASK_QUEUE,
            queue_arguments={
                "x-dead-letter-exchange": settings.CELERY_DLQ_EXCHANGE,
                "x-dead-letter-routing-key": settings.CELERY_DLQ_ROUTING_KEY,
            }
        ),
        Queue(
            settings.CELERY_DLQ_QUEUE,
            exchange=dlx_exchange,
            routing_key=settings.CELERY_DLQ_ROUTING_KEY
        )
    ],
    task_default_queue=settings.CELERY_TASK_QUEUE,
    task_default_exchange="default",
    task_default_routing_key=settings.CELERY_TASK_QUEUE
)
