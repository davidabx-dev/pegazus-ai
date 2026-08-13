import uuid
import hashlib
import logging
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter

from pegazus_ai.core.config import settings
from pegazus_ai.repositories.vector_repository import vector_repository, VectorRepository
from pegazus_ai.schemas.ingest import IngestDocumentRequest, IngestDocumentResponse

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Provedor de Embeddings configurável (FastEmbed para produção ou Fake para testes)."""

    def __init__(self, provider: str = None):
        self.provider = provider or settings.EMBEDDING_PROVIDER
        self._fastembed_model = None

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if self.provider == "fastembed":
            try:
                from fastembed import TextEmbedding
                if self._fastembed_model is None:
                    self._fastembed_model = TextEmbedding()
                embeddings = list(self._fastembed_model.embed(texts))
                return [emb.tolist() for emb in embeddings]
            except Exception as e:
                logger.error(f"Falha na geração de embeddings com o provedor FastEmbed: {e}")
                raise RuntimeError(f"Falha no serviço de embedding (FastEmbed): {e}")

        # Provider Fake determinístico para testes e desenvolvimento offline
        results = []
        for text in texts:
            seed = sum(ord(c) for c in text)
            vec = [((seed + i) % 100) / 100.0 for i in range(384)]
            norm = (sum(x**2 for x in vec)) ** 0.5 or 1.0
            results.append([x / norm for x in vec])
        return results

    def embed_query(self, text: str) -> List[float]:
        return self.embed_documents([text])[0]

embedding_service = EmbeddingService()

class IngestService:
    """Serviço de Ingestão de Documentos (Deduplicação + Chunking + Embeddings + Persistência por Usuário)."""

    def __init__(self, v_repo: VectorRepository = None, emb_service: EmbeddingService = None):
        self.vector_repo = v_repo or vector_repository
        self.embedding_service = emb_service or embedding_service
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", " ", ""]
        )

    def ingest_document(
        self,
        request: IngestDocumentRequest,
        user_id: str,
        document_id: str = None
    ) -> IngestDocumentResponse:
        doc_id = document_id or str(uuid.uuid4())

        # 🚩 DEDUPLICAÇÃO NA INGESTÃO: Calcula hash SHA-256 do conteúdo textual
        content_hash = hashlib.sha256(request.content.encode("utf-8")).hexdigest()

        if self.vector_repo.has_content_hash(content_hash, user_id):
            logger.info(f"Documento idêntico detectado para o user_id={user_id}. Ingestão ignorada (deduplicada).")
            return IngestDocumentResponse(
                document_id=doc_id,
                chunks_created=0,
                message="Documento idêntico já ingerido anteriormente para este usuário (deduplicado)."
            )

        # 1. Chunking do texto do documento
        chunks = self.text_splitter.split_text(request.content)
        if not chunks:
            chunks = [request.content]

        # 2. Geração de Embeddings para cada chunk
        embeddings = self.embedding_service.embed_documents(chunks)

        # 3. Metadados do documento incluindo o hash de deduplicação
        base_meta = {
            "document_id": doc_id,
            "content_hash": content_hash,
            **(request.metadata or {})
        }

        # 4. Salvar no Vector Repository com ISOLAMENTO POR USER_ID E POINT_ID DETERMINÍSTICO (UUIDv5)
        self.vector_repo.upsert_chunks(
            chunks=chunks,
            embeddings=embeddings,
            user_id=user_id,
            document_id=doc_id,
            base_metadata=base_meta
        )

        return IngestDocumentResponse(
            document_id=doc_id,
            chunks_created=len(chunks),
            message=f"Documento ingerido com sucesso ({len(chunks)} chunks gerados)."
        )

ingest_service = IngestService()
