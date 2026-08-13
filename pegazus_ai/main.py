from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from pegazus_ai.core.config import settings
from pegazus_ai.core.rate_limiter import limiter
from pegazus_ai.core.database import Base, engine
from pegazus_ai.routers import auth, ingest, query

# Inicializa as tabelas de banco de dados no startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend RAG com FastAPI, Pydantic v2, Qdrant e Segurança Avançada.",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 🚩 LIBERAÇÃO DE CORS: Permite chamadas vindo do Frontend Next.js (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar Rate Limiter no App FastAPI
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Incluir Routers com o prefixo da API v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(ingest.router, prefix=settings.API_V1_STR)
app.include_router(query.router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": "0.2.0"}