import uuid
import asyncio
from fastapi import APIRouter, Depends, Request, HTTPException, status, UploadFile, File
from celery.result import AsyncResult

from pegazus_ai.core.rate_limiter import limiter
from pegazus_ai.core.dependencies import get_current_user
from pegazus_ai.core.celery_app import celery_app
from pegazus_ai.repositories.user_repository import UserRecord
from pegazus_ai.schemas.ingest import (
    IngestDocumentRequest,
    AsyncIngestResponse,
    TaskStatusResponse
)
from pegazus_ai.services.file_parser import file_parser_service
from pegazus_ai.tasks.ingest_tasks import process_ingest_document_task

router = APIRouter(tags=["Ingestão"])

@router.post("/ingest", response_model=AsyncIngestResponse, status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("10/minute")
def ingest_document_async(
    request: Request,
    payload: IngestDocumentRequest,
    current_user: UserRecord = Depends(get_current_user)
):
    """🚩 ENDPOINT ASSÍNCRONO DE INGESTÃO (HTTP 202 Accepted):
    Gera o document_id UMA VEZ no recebimento da requisição e repassa para a task Celery."""
    try:
        document_id = str(uuid.uuid4())
        task = process_ingest_document_task.delay(
            content=payload.content,
            metadata=payload.metadata or {},
            tenant_id=current_user.id,
            document_id=document_id
        )
        return AsyncIngestResponse(
            task_id=task.id,
            document_id=document_id,
            status="ACCEPTED",
            message="Documento enviado para a fila de processamento assíncrono."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao agendar a tarefa de ingestão: {str(e)}"
        )

@router.post("/ingest/file", response_model=AsyncIngestResponse, status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("10/minute")
async def ingest_file_async(
    request: Request,
    file: UploadFile = File(...),
    current_user: UserRecord = Depends(get_current_user)
):
    """🚩 ENDPOINT DE UPLOAD DE ARQUIVOS REAL (.pdf, .docx, .txt, .md):
    Realiza o parsing do arquivo sem bloquear o Event Loop do FastAPI via asyncio.to_thread."""
    try:
        document_id = str(uuid.uuid4())
        content_bytes = await file.read()
        extracted_text = await asyncio.to_thread(file_parser_service.parse_file, file.filename, content_bytes)

        metadata = {
            "filename": file.filename,
            "content_type": file.content_type,
            "file_size": len(content_bytes)
        }

        task = process_ingest_document_task.delay(
            content=extracted_text,
            metadata=metadata,
            tenant_id=current_user.id,
            document_id=document_id
        )

        return AsyncIngestResponse(
            task_id=task.id,
            document_id=document_id,
            status="ACCEPTED",
            message=f"Arquivo '{file.filename}' lido e enviado para a fila de processamento assíncrono."
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro no upload e processamento do arquivo: {str(e)}"
        )

@router.get("/ingest/status/{task_id}", response_model=TaskStatusResponse)
def get_task_status(
    task_id: str,
    current_user: UserRecord = Depends(get_current_user)
):
    """Consulta o status de uma tarefa assíncrona do Celery por task_id."""
    res = AsyncResult(task_id, app=celery_app)
    
    if res.state == "SUCCESS":
        return TaskStatusResponse(
            task_id=task_id,
            status="COMPLETED",
            result=res.result
        )
    elif res.state == "FAILURE":
        return TaskStatusResponse(
            task_id=task_id,
            status="FAILED",
            result={"error": str(res.result)}
        )
    else:
        return TaskStatusResponse(
            task_id=task_id,
            status=res.state
        )
