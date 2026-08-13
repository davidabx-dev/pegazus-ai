from pegazus_ai.schemas.ingest import IngestDocumentRequest

def test_ingest_document_chunking_and_storage(test_ingest_service, test_vector_repo):
    user_id = "user-123"
    # Criar um texto longo para testar o chunking de 500 caracteres
    long_content = "Este é um documento operacional de teste para a Fase 1. " * 30

    request = IngestDocumentRequest(content=long_content, metadata={"source": "manual_teste"})
    response = test_ingest_service.ingest_document(request, user_id=user_id)

    assert response.document_id is not None
    assert response.chunks_created > 1
    assert "sucesso" in response.message

def test_chunk_size_and_overlap_parameters(test_ingest_service):
    splitter = test_ingest_service.text_splitter
    assert splitter._chunk_size == 500
    assert splitter._chunk_overlap == 50

def test_idempotent_upsert_on_celery_retry(test_ingest_service, test_vector_repo):
    """🚩 TESTE OBRIGATÓRIO (Fix 1): Ingerir o mesmo documento duas vezes com o mesmo document_id (simulando retry)
    deve gerar exatamente os mesmos point_ids UUIDv5 no Qdrant sem duplicar a contagem de pontos."""
    user_id = "user-retry-test"
    doc_id = "fixed-document-uuid-12345"
    content = "Conteúdo para ingestão idempotente durante o retry do Celery."

    req = IngestDocumentRequest(content=content)

    # 1. Primeira ingestão (tentativa 1)
    resp1 = test_ingest_service.ingest_document(req, user_id=user_id, document_id=doc_id)
    points_count_after_first = test_vector_repo.client.get_collection(test_vector_repo.collection_name).points_count

    # 2. Segunda ingestão (tentativa 2 - simulando retry automático do Celery com mesmo document_id)
    resp2 = test_ingest_service.ingest_document(req, user_id=user_id, document_id=doc_id)
    points_count_after_retry = test_vector_repo.client.get_collection(test_vector_repo.collection_name).points_count

    # Valida que o document_id se manteve e que a contagem de pontos NAO aumentou
    assert resp1.document_id == doc_id
    assert resp2.document_id == doc_id
    assert points_count_after_first == points_count_after_retry
