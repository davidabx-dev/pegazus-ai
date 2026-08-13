from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ChatMessage(BaseModel):
    role: str = Field(..., description="Papel na conversa: 'user' ou 'assistant'")
    content: str = Field(..., description="Conteúdo da mensagem")

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Pergunta para o assistente RAG")
    top_k: int = Field(default=3, ge=1, le=10, description="Número de trechos relevantes a recuperar")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Histórico das últimas N trocas de mensagens para suporte conversacional multi-turn")

class RetrievedSource(BaseModel):
    content: str
    metadata: Dict[str, Any]
    score: float

class QueryResponse(BaseModel):
    question: str
    answer: str
    sources: List[RetrievedSource]
