from fastapi import APIRouter, Depends, Request, HTTPException, status
from pegazus_ai.core.rate_limiter import limiter
from pegazus_ai.core.dependencies import get_current_user
from pegazus_ai.core.logger import app_logger
from pegazus_ai.repositories.user_repository import UserRecord
from pegazus_ai.schemas.query import QueryRequest, QueryResponse
from pegazus_ai.services.rag_service import rag_service
from pegazus_ai.services.semantic_cache import semantic_cache_service

router = APIRouter(tags=["Consulta RAG"])

@router.post("/query", response_model=QueryResponse)
@limiter.limit("20/minute")
def query_rag(
    request: Request,
    payload: QueryRequest,
    current_user: UserRecord = Depends(get_current_user)
):
    """🚩 ENDPOINT DE CONSULTA RAG COM CACHE SEMÂNTICO E RASTREAMENTO DE TENANT:
    1. Tenant ID é extraído ESTRITAMENTE do token JWT decodificado (current_user.id).
    2. Checa o Cache Semântico no Redis antes de chamar a LLM.
    3. Se houver hit no cache, retorna instantaneamente a resposta economizando chamadas da LLM."""
    tenant_id = current_user.id

    # 1. 🔍 Checar Cache Semântico Redis
    cached = semantic_cache_service.get(tenant_id=tenant_id, question=payload.question)
    if cached:
        app_logger.info(
            f"Resposta servida pelo Cache Semântico Redis para tenant_id={tenant_id}"
        )
        return QueryResponse(**cached)

    # 2. Cache Miss: Executar pipeline de RAG
    try:
        response = rag_service.query(request=payload, user_id=tenant_id)
        
        # 3. Gravador no Cache Semântico com TTL
        semantic_cache_service.set(
            tenant_id=tenant_id,
            question=payload.question,
            response_data=response.model_dump()
        )

        app_logger.info(
            f"Consulta RAG executada e cached com sucesso para tenant_id={tenant_id}"
        )
        return response

    except Exception as e:
        app_logger.error(
            f"Erro interno na execução da consulta RAG para tenant_id={tenant_id}: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha interna ao processar a consulta RAG."
        )
