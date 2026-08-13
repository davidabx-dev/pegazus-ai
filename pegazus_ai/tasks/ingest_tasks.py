from pegazus_ai.core.celery_app import celery_app
from pegazus_ai.core.logger import app_logger
from pegazus_ai.schemas.ingest import IngestDocumentRequest
from pegazus_ai.services.ingest_service import ingest_service

@celery_app.task(
    bind=True,
    name="tasks.process_ingest_document",
    max_retries=3,
    default_retry_delay=5,
    acks_late=True
)
def process_ingest_document_task(self, content: str, metadata: dict, tenant_id: str, document_id: str = None):
    """🚩 TASK ASSÍNCRONA DO CELERY COM DLQ E IDEMPOTÊNCIA:
    Executa chunking, embedding e salvamento vetorial isolado por tenant_id reutilizando o mesmo document_id.
    Caso ocorram falhas consecutivas (> 3 tentativas), a mensagem é enviada para a Dead Letter Queue (DLQ)."""
    task_id = self.request.id
    app_logger.info(
        f"Iniciando task de ingestão assíncrona task_id={task_id}, doc_id={document_id} para tenant_id={tenant_id}"
    )

    try:
        req = IngestDocumentRequest(content=content, metadata=metadata)
        result = ingest_service.ingest_document(
            request=req,
            user_id=tenant_id,
            document_id=document_id
        )
        
        app_logger.info(
            f"Task de ingestão concluída com sucesso task_id={task_id}, chunks={result.chunks_created}"
        )
        return {
            "status": "COMPLETED",
            "document_id": result.document_id,
            "chunks_created": result.chunks_created,
            "message": result.message
        }
    except Exception as exc:
        app_logger.error(
            f"Erro na execução da task de ingestão task_id={task_id} (Tentativa {self.request.retries + 1}/3): {exc}"
        )
        # Se esgotar as tentativas, exceção não capturada lança para a DLQ do RabbitMQ
        if self.request.retries >= self.max_retries:
            app_logger.critical(
                f"Task task_id={task_id} atingiu limite máximo de retries. Enviando para a Dead Letter Queue (DLQ)."
            )
            raise exc
        
        raise self.retry(exc=exc)
