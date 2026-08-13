import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from pegazus_ai.main import app
from pegazus_ai.core.database import Base
from pegazus_ai.repositories.user_repository import UserRepository
from pegazus_ai.repositories.vector_repository import VectorRepository
from pegazus_ai.services.ingest_service import IngestService, EmbeddingService
from pegazus_ai.services.rag_service import RAGService, LLMService
from pegazus_ai.services.auth_service import AuthService

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def test_user_repo():
    # 🚩 ISOLAMENTO DE TESTES: Banco de dados SQLite em memória isolado para cada teste
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return UserRepository(db_factory=TestingSessionLocal)

@pytest.fixture
def test_vector_repo():
    return VectorRepository(location=":memory:", collection_name="test_collection")

@pytest.fixture
def test_auth_service(test_user_repo):
    return AuthService(repo=test_user_repo)

@pytest.fixture
def test_embedding_service():
    return EmbeddingService(provider="fake")

@pytest.fixture
def test_llm_service():
    return LLMService(provider="fake")

@pytest.fixture
def test_ingest_service(test_vector_repo, test_embedding_service):
    return IngestService(v_repo=test_vector_repo, emb_service=test_embedding_service)

@pytest.fixture
def test_rag_service(test_vector_repo, test_embedding_service, test_llm_service):
    return RAGService(v_repo=test_vector_repo, emb_service=test_embedding_service, llm_srv=test_llm_service)
