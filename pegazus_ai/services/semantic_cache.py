import hashlib
import json
from typing import Optional, Dict, Any
from pegazus_ai.core.config import settings
from pegazus_ai.core.logger import app_logger

class SemanticCacheService:
    """Serviço de Cache de Consultas por Hash Exato via Redis com escopo isolado por tenant_id e TTL.
    Decisão de Arquitetura: Optou-se por cache de hash exato (SHA-256 da pergunta normalizada) com o prefixo
    'tenant:{tenant_id}:query_cache:{hash}' em vez de busca por similaridade vetorial no cache para garantir 
    isolamento absoluto por chave no Redis sem risco de vazamento cross-tenant."""

    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self.ttl = settings.SEMANTIC_CACHE_TTL
        self._redis_client = None

    def _get_client(self):
        if self._redis_client is None:
            try:
                import redis
                self._redis_client = redis.Redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_timeout=0.8,
                    socket_connect_timeout=0.8
                )
            except Exception as e:
                app_logger.warning(f"Não foi possível conectar ao Redis para o Semantic Cache: {e}")
                return None
        return self._redis_client

    def _make_key(self, tenant_id: str, question: str) -> str:
        # 🚩 PONTO SENSÍVEL DE SEGURANÇA (Fix 2): Chave com prefixo explícito e escopo por tenant_id
        hashed_q = hashlib.sha256(question.strip().lower().encode('utf-8')).hexdigest()
        return f"tenant:{tenant_id}:query_cache:{hashed_q}"

    def get(self, tenant_id: str, question: str) -> Optional[Dict[str, Any]]:
        if not settings.ENABLE_SEMANTIC_CACHE:
            return None

        client = self._get_client()
        if not client:
            return None

        try:
            key = self._make_key(tenant_id, question)
            cached_val = client.get(key)
            if cached_val:
                app_logger.info(f"CACHE HIT (Redis) para tenant_id={tenant_id}")
                return json.loads(cached_val)
        except Exception as e:
            app_logger.warning(f"Erro ao ler do Semantic Cache Redis: {e}")
        return None

    def set(self, tenant_id: str, question: str, response_data: Dict[str, Any], ttl: int = None) -> None:
        if not settings.ENABLE_SEMANTIC_CACHE:
            return

        client = self._get_client()
        if not client:
            return

        try:
            key = self._make_key(tenant_id, question)
            expire = ttl or self.ttl
            client.setex(key, expire, json.dumps(response_data))
            app_logger.info(f"CACHE SET (Redis) para tenant_id={tenant_id} com TTL={expire}s")
        except Exception as e:
            app_logger.warning(f"Erro ao gravar no Semantic Cache Redis: {e}")

semantic_cache_service = SemanticCacheService()
