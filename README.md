# Pegazus-AI

**Pegazus-AI** é um assistente RAG (*Retrieval-Augmented Generation*) backend de nível de produção (*Enterprise Ready*), construído com **Python, FastAPI, Pydantic v2, Celery, RabbitMQ, Redis, Qdrant e PostgreSQL**.

O sistema foi projetado para responder a dúvidas operacionais com **processamento assíncrono em segundo plano**, **isolamento multitenant**, **proteção contra prompt injection**, **cache semântico** e **observabilidade em logs JSON**.

---

## 🏛️ Arquitetura Distribuída (Fase 2)

O projeto segue a arquitetura em camadas **`router` → `service` → `repository`**, integrada a workers assíncronos e brokers de mensageria:

```
pegazus-ai/
├── Dockerfile                   # Dockerfile multi-stage otimizado (usuario appuser)
├── docker-compose.yml           # Orquestracao dos 6 servicos de infraestrutura
├── pyproject.toml
├── pegazus_ai/
│   ├── main.py                  # FastAPI App, middlewares e excecoes de Rate Limit
│   ├── core/                    # JWT, Bcrypt, Celery App, Loguru JSON, Redis, Config
│   ├── schemas/                 # Schemas Pydantic v2 (Auth, Ingest, Query, Tasks)
│   ├── routers/                 # Routers HTTP (/auth, /ingest, /query)
│   ├── services/                # Regras de Negocio (RAG, FileParser, SemanticCache, Auth)
│   ├── tasks/                   # Tasks Celery assincronas com RabbitMQ e DLQ
│   └── repositories/            # Persistencia de Usuarios e Qdrant Vector Store
└── tests/                       # Suite de testes unitarios com pytest
```

---

## 💡 Decisões de Arquitetura & Infraestrutura (Fase 2)

1. **Ingestão Assíncrona (Celery + RabbitMQ + DLQ)**:
   - *Justificativa*: Processar PDFs longos em requisições HTTP síncronas gera timeouts. O endpoint `/ingest` aceita a requisição, envia o trabalho para o **RabbitMQ** e retorna HTTP `202 Accepted` com um `task_id`.
   - 🚩 *Dead Letter Queue (DLQ)*: Mensagens de documentos corrompidos que falharem após 3 tentativas (`max_retries=3`) são desviadas para a fila de Dead Letter (`ingestion_dlq`), evitando loops infinitos de retries.

2. **Cache de Consultas por Hash Exato no Redis**:
   - *Justificativa de Arquitetura*: Optou-se por cache por chave hash exata (`SHA-256` da pergunta normalizada) com o prefixo `tenant:{tenant_id}:query_cache:{hash}` e TTL de 1 hora (3600s). Essa escolha garante isolamento físico absoluto entre tenants no Redis por chave direta, eliminando qualquer risco de vazamento cross-tenant que ocorreria em buscas por similaridade no cache.
   - ⚠️ *Risco Conhecido (Prompt Injection & Cache)*: Se uma resposta for gerada a partir de uma consulta influenciada por prompt injection e for armazenada no Cache, ela poderá ser servida a outras requisições do mesmo tenant durante o período de TTL sem re-executar a LLM ou as instruções de segurança do System Prompt. Este é um risco adicional documentado.

3. **Parser de Arquivos Reais (`.pdf`, `.docx`, `.txt`, `.md`)**:
   - Endpoint `POST /api/v1/ingest/file` permite upload multipart de documentos. Extraímos o texto bruto com `pypdf` e `python-docx` antes de enviar para o chunking e embeddings.

4. **Multitenancy & Rastreamento de Custos**:
   - 🔒 *Segurança*: O `tenant_id` utilizado para rastrear o uso de tokens e isolar os vetores no Qdrant é derivado **exclusivamente do token JWT decodificado no middleware de autenticação**, nunca de dados soltos no body da requisição.

5. **Observabilidade Estruturada (`loguru`)**:
   - Saída de logs padronizada em formato JSON estruturado com timestamps ISO, `tenant_id`, `task_id` e metadados de execução.

6. **Orquestração Docker Compose Multi-Contêiner**:
   - 6 Serviços configurados no `docker-compose.yml` com limites rígidos de memória (`mem_limit`):
     - `web`: FastAPI App (8000)
     - `celery_worker`: Worker de tarefas assíncronas
     - `rabbitmq`: Message Broker + DLQ + Painel Management (5672 / 15672)
     - `redis`: Result Backend e Cache Semântico (6379)
     - `qdrant`: Vector Store com volume persistente em disco (6333)
     - `postgres`: Banco de dados relacional com volume persistente (5432)

---

## 🚀 Como Executar o Projeto

### Opção 1: Executando a Infraestrutura Completa com Docker Compose (Recomendado)

Suba os 6 contêineres conteinerizados com limites de recurso com um único comando:

```bash
docker compose up -d --build
```

Acesse as interfaces da aplicação:
- **FastAPI Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Painel RabbitMQ Management**: [http://localhost:15672](http://localhost:15672) (Usuário/Senha: `guest`/`guest`)

Para parar os serviços mantendo a persistência de dados nos volumes:

```bash
docker compose down
```

---

### Opção 2: Executando os Testes Automatizados com `pytest`

No PowerShell/Terminal local:

```bash
python -m pytest -v
```

---

## 🚦 Checklist de Conformidade — Fase 2

- [x] 1. Ingestão Assíncrona via Celery com HTTP 202 Accepted e `task_id`
- [x] 2. Dead Letter Queue (DLQ) configurada no RabbitMQ (`ingestion_dlq`)
- [x] 3. Orquestração Docker Compose com 6 serviços, volumes persistentes e `mem_limit`
- [x] 4. Parser de arquivos reais (`.pdf`, `.docx`, `.txt`, `.md`) via upload multipart
- [x] 5. Cache Semântico no Redis com TTL e escopo isolado por `tenant_id`
- [x] 6. Observabilidade com logs JSON via `loguru`
- [x] 7. Rastreamento de `tenant_id` derivado estritamente do token de autenticação
- [x] 8. Suíte de testes unitários passando limpa com `pytest`
