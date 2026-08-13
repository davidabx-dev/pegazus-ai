import uuid
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from pegazus_ai.core.config import settings

POINT_ID_NAMESPACE = uuid.UUID("a9b8c7d6-e5f4-4321-8765-43210fedcba9")

def make_point_id(document_id: str, chunk_index: int) -> str:
    """Gera um UUIDv5 determinístico baseado no document_id e índice do chunk.
    Compatível com os requisitos de ID do Qdrant (UUID string válido)."""
    return str(uuid.uuid5(POINT_ID_NAMESPACE, f"{document_id}:{chunk_index}"))

class VectorRepository:
    """Repositório para operações no Vector Store Qdrant com suporte a Deduplicação e Isolamento por Usuário."""

    def __init__(self, location: str = None, collection_name: str = None):
        self.location = location or settings.QDRANT_LOCATION
        self.collection_name = collection_name or settings.QDRANT_COLLECTION_NAME
        
        if self.location == ":memory:":
            self.client = QdrantClient(location=":memory:")
        elif self.location.startswith("http://") or self.location.startswith("https://"):
            self.client = QdrantClient(url=self.location)
        else:
            self.client = QdrantClient(path=self.location)
            
        self._collection_initialized = False

    def _ensure_collection(self, vector_size: int):
        if not self._collection_initialized:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=qmodels.VectorParams(
                        size=vector_size,
                        distance=qmodels.Distance.COSINE
                    )
                )
            self._collection_initialized = True

    def has_content_hash(self, content_hash: str, user_id: str) -> bool:
        """🚩 DEDUPLICAÇÃO NA INGESTÃO: Verifica se já existe um documento com o mesmo hash de conteúdo para o usuário."""
        try:
            self._ensure_collection(384)
            res = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(key="user_id", match=qmodels.MatchValue(value=str(user_id))),
                        qmodels.FieldCondition(key="content_hash", match=qmodels.MatchValue(value=str(content_hash)))
                    ]
                ),
                limit=1
            )
            return len(res[0]) > 0
        except Exception:
            return False

    def upsert_chunks(
        self,
        chunks: List[str],
        embeddings: List[List[float]],
        user_id: str,
        document_id: str,
        base_metadata: Dict[str, Any] = None
    ) -> List[str]:
        if not document_id or not str(document_id).strip():
            raise ValueError("document_id é obrigatório para garantir a idempotência do upsert vetorial.")

        if not chunks or not embeddings:
            return []

        doc_id = str(document_id)
        vector_size = len(embeddings[0])
        self._ensure_collection(vector_size)

        points = []
        point_ids = []
        base_meta = base_metadata or {}

        for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            point_id = make_point_id(doc_id, idx)
            point_ids.append(point_id)

            payload = {
                **base_meta,
                "content": chunk,
                "document_id": doc_id,
                "chunk_index": idx,
                "user_id": str(user_id)  # 🔒 ISOLAMENTO OBRIGATÓRIO POR USUÁRIO
            }

            points.append(
                qmodels.PointStruct(
                    id=point_id,
                    vector=emb,
                    payload=payload
                )
            )

        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        return point_ids

    def search_similarity(
        self,
        query_vector: List[float],
        user_id: str,
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        vector_size = len(query_vector)
        self._ensure_collection(vector_size)

        user_filter = qmodels.Filter(
            must=[
                qmodels.FieldCondition(
                    key="user_id",
                    match=qmodels.MatchValue(value=str(user_id))
                )
            ]
        )

        if hasattr(self.client, "query_points"):
            response = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=user_filter,
                limit=limit
            )
            search_results = response.points
        else:
            search_results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=user_filter,
                limit=limit
            )

        results = []
        for res in search_results:
            payload = getattr(res, "payload", {}) or {}
            score = getattr(res, "score", 0.0)
            results.append({
                "content": payload.get("content", ""),
                "metadata": {k: v for k, v in payload.items() if k not in ("content",)},
                "score": float(score)
            })
        return results

vector_repository = VectorRepository()
