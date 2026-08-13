from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

class IngestDocumentRequest(BaseModel):
    content: str = Field(..., min_length=10, description="Conteúdo textual do documento a ser ingerido no RAG")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadados adicionais do documento")

class IngestDocumentResponse(BaseModel):
    document_id: str
    chunks_created: int
    message: str

class AsyncIngestResponse(BaseModel):
    task_id: str
    document_id: str
    status: str = "ACCEPTED"
    message: str = "Ingestão agendada com sucesso para processamento assíncrono."

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
