import pytest
from unittest.mock import MagicMock, patch
from pegazus_ai.tasks.ingest_tasks import process_ingest_document_task

def test_process_ingest_document_task_success():
    tenant_id = "tenant-test-123"
    content = "Conteúdo de teste para ingestão assíncrona via task do Celery."
    metadata = {"origem": "teste_unitario"}

    with patch("pegazus_ai.tasks.ingest_tasks.ingest_service") as mock_ingest:
        mock_result = MagicMock()
        mock_result.document_id = "doc-123"
        mock_result.chunks_created = 2
        mock_result.message = "Sucesso"
        mock_ingest.ingest_document.return_value = mock_result

        # Execução da task Celery
        task_result = process_ingest_document_task.apply(
            kwargs={"content": content, "metadata": metadata, "tenant_id": tenant_id}
        )

        result = task_result.get()
        assert result["status"] == "COMPLETED"
        assert result["chunks_created"] == 2
        mock_ingest.ingest_document.assert_called_once()

def test_process_ingest_document_task_max_retries_raises_exception_for_dlq():
    """🚩 TESTE DLQ: Garante que após atingir max_retries (3), a task relança a exceção não tratada.
    Isso força o Celery (com task_acks_on_failure_or_timeout=False) a NÃO dar ACK, enviando a mensagem para a DLQ."""
    tenant_id = "tenant-test-123"
    content = "Conteúdo com erro que forçará retries."
    metadata = {"origem": "teste_dlq"}

    with patch("pegazus_ai.tasks.ingest_tasks.ingest_service") as mock_ingest:
        mock_ingest.ingest_document.side_effect = RuntimeError("Erro simulado de ingestão de arquivo corrompido")

        task_result = process_ingest_document_task.apply(
            kwargs={"content": content, "metadata": metadata, "tenant_id": tenant_id},
            retries=3
        )

        with pytest.raises(RuntimeError, match="Erro simulado de ingestão"):
            task_result.get()
