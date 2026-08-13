from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    APP_NAME: str = "Pegazus-AI"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Security & JWT
    SECRET_KEY: str = "pegazus_ai_super_secret_jwt_key_for_dev_phase_1"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database Settings (Persistência Relacional PostgreSQL)
    DATABASE_URL: str = "postgresql://pegazus:pegazus_password@localhost:5432/pegazus_db"

    # Vector Store (Qdrant)
    QDRANT_LOCATION: str = ":memory:"
    QDRANT_COLLECTION_NAME: str = "pegazus_documents"

    # LLM & Embedding Settings
    LLM_PROVIDER: Literal["groq", "google", "fake"] = "groq"
    GROQ_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GROQ_MODEL_NAME: str = "llama-3.3-70b-versatile"
    GOOGLE_MODEL_NAME: str = "gemini-1.5-flash"
    
    EMBEDDING_PROVIDER: Literal["fastembed", "fake"] = "fastembed"

    # Broker & Celery Settings (Fase 2)
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672//"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    CELERY_TASK_QUEUE: str = "ingestion_queue"
    CELERY_DLQ_EXCHANGE: str = "dlx_exchange"
    CELERY_DLQ_QUEUE: str = "ingestion_dlq"
    CELERY_DLQ_ROUTING_KEY: str = "ingestion_dead_letter"

    # Semantic Cache Settings
    SEMANTIC_CACHE_TTL: int = 3600  # 1 hora em segundos
    ENABLE_SEMANTIC_CACHE: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
