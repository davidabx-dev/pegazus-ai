# 🐴 Pegazus-AI

> Plataforma **RAG (Retrieval-Augmented Generation)** full stack, multi-tenant, para conversar com seus próprios documentos via IA — com citação de fontes, cache semântico, ingestão assíncrona e OCR embutido.

Backend em **Python/FastAPI**, banco vetorial **Qdrant**, fila **Celery + RabbitMQ**, cache **Redis**, e frontend em **Next.js 16 (App Router) + React 19**.

---

## 📑 Índice

- [Visão Geral](#-visão-geral)
- [Arquitetura](#-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [Stack Tecnológica](#-stack-tecnológica)
- [Como Rodar o Projeto](#-como-rodar-o-projeto)
  - [Opção 1 — Docker Compose](#opção-1--docker-compose-recomendado)
  - [Opção 2 — Modo Desenvolvimento Local](#opção-2--modo-desenvolvimento-local-sem-docker)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Fluxo de Ingestão de Documentos](#-fluxo-de-ingestão-de-documentos)
- [Fluxo de Consulta RAG](#-fluxo-de-consulta-rag)
- [Segurança](#-segurança)
- [Testes](#-testes)
- [Painéis e Acessos](#-painéis-e-acessos)
- [Comandos Úteis](#-comandos-úteis)
- [Roadmap](#-roadmap)
- [Licença](#-licença)

---

## 🚀 Visão Geral

O **Pegazus-AI** permite que qualquer usuário/empresa envie documentos (PDF, DOCX, TXT, MD e até imagens ou PDFs escaneados) e converse com esse conteúdo através de um chat com IA. As respostas trazem **citação da fonte exata** (documento e trecho), sem misturar dados entre usuários diferentes (multitenancy estrito) e com otimização de custo via cache semântico e embeddings locais.

O projeto foi construído com foco em:

- **Resiliência** — ingestão 100% assíncrona, com fila de erro (Dead Letter Queue).
- **Segurança** — mitigação ativa contra os principais riscos da OWASP Top 10 para LLMs.
- **Custo** — embeddings gerados localmente, cache semântico com alta taxa de economia de chamadas de LLM.
- **Experiência do usuário** — dashboard em tempo real, upload por drag-and-drop, chat com fontes citadas.

---

## 🏗️ Arquitetura

```
Cliente Web (Next.js 16 / React 19)
        │  HTTP REST + JWT
        ▼
   API Gateway (FastAPI)
   ├── Auth Service (Bcrypt + JWT)
   ├── Query Router (RAG)
   └── Ingest Router (Assíncrono)
        │
        ├── PostgreSQL / SQLite  → usuários e refresh tokens
        ├── Redis                → cache semântico por tenant
        ├── Qdrant                → banco vetorial
        ├── RabbitMQ + Celery     → fila de ingestão + Dead Letter Queue
        └── LLM (Groq Llama 3.3 70B ou Gemini 1.5 Flash)
```

```mermaid
graph TD
    Client[Cliente Web - Next.js 16 / React 19] -->|HTTP REST / JWT| FastAPI[API Gateway FastAPI]

    subgraph Backend - pegazus_ai
        FastAPI --> Auth[Auth Service & Bcrypt]
        FastAPI --> Query[RAG Query Router]
        FastAPI --> Ingest[Async Ingest Router]

        Auth --> Postgres[(PostgreSQL / SQLite)]
        Query --> RedisCache[(Redis Cache Semântico)]
        Query --> Qdrant[(Qdrant Vector DB)]
        Query --> LLM[Provedor LLM: Groq / Gemini]

        Ingest --> RabbitMQ{{RabbitMQ Broker}}
        RabbitMQ --> Celery[Celery Worker Task]
        RabbitMQ --> DLQ{{Dead Letter Queue - DLQ}}
        Celery --> FileParser[File Parser PDF/DOCX/TXT/IMG + OCR]
        Celery --> FastEmbed[FastEmbed Embeddings]
        Celery --> Qdrant
    end
```

---

## ✨ Funcionalidades

### Backend
- Ingestão assíncrona de documentos com resposta imediata (`202 Accepted`) e acompanhamento por polling.
- Parser de arquivos com suporte a **PDF, DOCX, TXT, MD** e imagens (**PNG, JPG, JPEG, WEBP**).
- **OCR embutido** (RapidOCR) com fallback automático para PDFs escaneados sem camada de texto.
- Deduplicação idempotente de documentos via hash SHA-256.
- Proteção contra *zip bomb* em arquivos DOCX e contra estouro de memória em PDFs grandes.
- Busca vetorial com filtro obrigatório por usuário/tenant.
- Sanitização do contexto RAG contra *prompt injection* (OWASP LLM01).
- Histórico de conversa multi-turn (últimas 6 mensagens) no contexto da LLM.
- Cache semântico de perguntas no Redis, isolado por tenant, com TTL de 1 hora.
- Autenticação JWT com **rotação de refresh token de uso único** (hash SHA-256 no banco).
- Rate limiting por endpoint (SlowAPI).

### Frontend
- Dashboard com métricas em tempo real (documentos processados, fila ativa, chunks vetoriais, armazenamento).
- Upload por drag-and-drop com polling de status a cada 2,5s.
- Chat RAG interativo com badge de relevância, citação de fontes e modal de leitura do trecho original.
- Painel de fontes vetoriais deduplicado por documento e sincronizado com o histórico de ingestão.
- Menu de contexto (3 pontinhos) com opção de exclusão de fonte/documento.
- Tela de login com efeito 3D reativo ao cursor.
- Interceptor HTTP 401 com renovação automática de token, transparente ao usuário.
- Vídeo de fundo em loop otimizado (MP4 via FFmpeg) na interface.

---

## 🧰 Stack Tecnológica

| Camada | Tecnologias |
|---|---|
| **Backend** | Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy, SlowAPI |
| **Banco relacional** | PostgreSQL (produção) / SQLite (dev/testes) |
| **Banco vetorial** | Qdrant |
| **Fila / Mensageria** | RabbitMQ + Celery (com Dead Letter Queue) |
| **Cache** | Redis |
| **Embeddings** | FastEmbed (`BAAI/bge-small-en-v1.5`, 384 dimensões) |
| **OCR** | RapidOCR (`rapidocr-onnxruntime`) |
| **Parsing de PDF** | PyMuPDF (`fitz`) |
| **LLM** | Groq (Llama 3.3 70B) ou Google Gemini 1.5 Flash |
| **Autenticação** | JWT + Bcrypt (`pwdlib`) |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| **Infra** | Docker + Docker Compose |
| **Testes** | Pytest (backend), `tsc --noEmit` (frontend) |

---

## ⚙️ Como Rodar o Projeto

### Opção 1 — Docker Compose (recomendado)

Sobe toda a infraestrutura de uma vez: FastAPI, RabbitMQ, Redis, Qdrant e PostgreSQL.

```bash
# 1. Na raiz do projeto (pegazus-ai)
docker compose up -d --build
```

```bash
# 2. Em outro terminal, na pasta do frontend
cd pegazus-frontend
npm install
npm run dev
```

### Opção 2 — Modo desenvolvimento local (sem Docker)

```bash
# Terminal 1 — Backend
python -m uvicorn pegazus_ai.main:app --reload --port 8000
```

> A API sobe em `http://localhost:8000`, usando `pegazus_db.sqlite` local.

```bash
# Terminal 2 — Frontend
cd pegazus-frontend
npm install
npm run dev
```

### Acessando a aplicação

| Serviço | URL |
|---|---|
| Frontend (Dashboard) | http://localhost:3000 |
| Documentação Swagger (API) | http://localhost:8000/docs |
| RabbitMQ Management | http://localhost:15672 |

**Credenciais de demonstração:**
```
E-mail: demo@pegazus.ai
Senha:  senha123
```

> ⚠️ Substitua por credenciais reais/seguras antes de qualquer deploy em produção. Nunca commite `.env` com segredos reais.

---

## 🔑 Variáveis de Ambiente

Configuradas em `.env` (veja `.env.example`):

| Variável | Exemplo | Descrição |
|---|---|---|
| `APP_NAME` | `Pegazus-AI` | Nome exibido nos logs e no endpoint `/health` |
| `SECRET_KEY` | `troque_por_um_valor_seguro` | Chave usada para assinar os tokens JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Tempo de vida do token de acesso |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Tempo de vida do refresh token |
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/pegazus_db` | Conexão com o banco (fallback SQLite em testes) |
| `QDRANT_LOCATION` | `:memory:` ou `http://localhost:6333` | Onde os vetores são armazenados |
| `LLM_PROVIDER` | `groq` \| `google` \| `fake` | Motor de IA usado para gerar respostas |
| `GROQ_API_KEY` | `gsk_...` | Chave de API para o modelo Llama 3.3 70B via Groq |
| `GOOGLE_API_KEY` | `AIza...` | Chave de API para o Gemini 1.5 Flash |
| `EMBEDDING_PROVIDER` | `fastembed` \| `fake` | Modelo de embeddings (local) |

---

## 📁 Estrutura do Projeto

### Backend — `pegazus_ai/`

```
pegazus_ai/
├── main.py                    # Entry point da aplicação FastAPI
├── core/
│   ├── config.py               # Configurações e variáveis de ambiente
│   ├── security.py             # Hash de senha, criação/validação de JWT
│   ├── dependencies.py         # Injeção de dependências (usuário atual, tenant, etc.)
│   └── models.py               # Modelos SQLAlchemy (users, refresh_tokens)
├── routers/
│   ├── auth.py                 # Endpoints de autenticação
│   ├── ingest.py                # Endpoints de ingestão de documentos
│   └── query.py                # Endpoint de consulta RAG
├── services/
│   ├── auth_service.py         # Lógica de registro, login e refresh
│   ├── rag_service.py          # Orquestração da consulta RAG + sanitização
│   ├── ingest_service.py       # Deduplicação, chunking e orquestração da ingestão
│   ├── file_parser.py           # Parser de PDF/DOCX/TXT/MD/imagens + OCR
│   └── semantic_cache.py        # Cache semântico no Redis
├── repositories/
│   └── vector_repository.py    # Camada de acesso ao Qdrant
├── schemas/                    # Schemas Pydantic (request/response)
└── tasks/
    └── ingest_tasks.py         # Tarefas Celery de ingestão assíncrona
```

### Frontend — `pegazus-frontend/`

```
pegazus-frontend/
├── app/
│   ├── layout.tsx               # Layout raiz + vídeo de fundo
│   ├── login/
│   │   └── page.tsx              # Tela de login com efeito 3D
│   └── dashboard/
│       ├── page.tsx              # Montagem do layout e hooks
│       ├── types/
│       │   └── dashboard.types.ts
│       ├── hooks/
│       │   ├── useIngestionStatus.ts   # Polling de status + upload
│       │   └── useRagQuery.ts          # Mensagens e consultas RAG
│       └── components/
│           ├── Header/
│           ├── KnowledgeIngestion/     # Upload + histórico de ingestões
│           ├── RagChatPanel/           # Chat RAG
│           └── VectorSourcesPanel/     # Fontes vetoriais recuperadas
│               └── SourceCard.tsx      # Menu de 3 pontinhos + exclusão
├── context/
│   └── AuthContext.tsx          # Contexto global de autenticação
└── lib/
    └── api.ts                   # Cliente HTTP + interceptor de refresh (401)
```

---

## 🔄 Fluxo de Ingestão de Documentos

```
[1. Upload do Arquivo] → [2. Parser (PyMuPDF / OCR / DOCX)] → [3. Fila Celery (RabbitMQ)]
                                                                          │
[6. Notificação no Dashboard] ← [5. Upsert no Qdrant] ← [4. Chunking + FastEmbed]
```

1. **Upload**: o frontend envia `POST /api/v1/ingest/file` (multipart).
2. **Parsing não bloqueante**: extração via `asyncio.to_thread`, com proteção contra zip bomb e limite de tamanho. Se o PDF for escaneado (sem texto selecionável), a página é renderizada em imagem (150 DPI) e passada pelo OCR (RapidOCR).
3. **Resposta imediata**: `HTTP 202 Accepted` com `task_id` e `document_id`.
4. **Processamento assíncrono**: o worker Celery consome a fila do RabbitMQ.
5. **Deduplicação**: hash SHA-256 do texto — se o documento já existe para o usuário, a ingestão é ignorada.
6. **Chunking + embeddings**: texto dividido em blocos de 500 caracteres (overlap de 50), vetorizado em 384 dimensões via FastEmbed.
7. **Persistência no Qdrant**: IDs determinísticos (UUIDv5) baseados em `document_id` + `chunk_index`, sempre associados ao `user_id`.
8. **Resiliência**: até 3 retries automáticos; falha persistente vai para a Dead Letter Queue (`ingestion_dlq`).
9. **Polling**: o frontend consulta `/ingest/status/{task_id}` a cada 2,5s até `COMPLETED`.

---

## 🧠 Fluxo de Consulta RAG

```
[Pergunta do Usuário] → [Checa Cache Redis] --(HIT)--> [Resposta instantânea]
                              │
                           (MISS)
                              ▼
     [Busca vetorial no Qdrant, filtrada por user_id]
                              ▼
     [Sanitização anti prompt injection (OWASP LLM01)]
                              ▼
     [LLM (Groq / Gemini) com histórico + contexto + pergunta]
                              ▼
     [Grava no Redis (TTL 1h)] → [Resposta + fontes citadas]
```

1. **Validação de tenant**: `tenant_id` extraído estritamente do JWT decodificado.
2. **Cache semântico**: chave `tenant:{tenant_id}:query_cache:{sha256(pergunta)}`; cache HIT retorna em milissegundos.
3. **Cache MISS**:
   - Embedding da pergunta (384 dimensões).
   - Busca no Qdrant pelos 4 chunks mais similares (distância de cosseno), filtrados por `user_id`.
   - Sanitização por regex do texto recuperado, impedindo que um documento malicioso "feche" a tag de contexto confiável.
   - Chamada à LLM com histórico da conversa + contexto + pergunta.
   - Gravação do resultado no cache (TTL de 3600s).

---

## 🛡️ Segurança

### Tokens e credenciais
- Senhas com hash Bcrypt (`pwdlib`).
- Refresh tokens de uso único: apenas o **hash SHA-256** é armazenado no banco; o token em texto puro existe só no navegador do cliente. Após o primeiro uso, o token é revogado.
- `tenant_id`/`user_id` sempre extraído do JWT decodificado no servidor — nunca aceito como parâmetro vindo do cliente.

### Mitigação OWASP Top 10 para LLMs

| Risco | Mitigação implementada |
|---|---|
| **LLM01 — Prompt Injection** | Sanitização por regex (case-insensitive) que escapa a tag de contexto confiável, impedindo que um documento injete instruções no prompt |
| **LLM02 — Insecure Output Handling** | Renderização segura no React, sem `dangerouslySetInnerHTML` |
| **LLM06 — Excessive Agency** | Assistente estritamente de leitura (RAG); sem permissão de executar código ou comandos no servidor |
| **LLM08 — Vector & Embeddings Weaknesses** | Filtro obrigatório por `user_id` em toda busca vetorial + isolamento por tenant nas chaves do Redis |

### Outras proteções
- Proteção contra *zip bomb* em uploads DOCX (limite de tamanho descompactado).
- Limite de páginas/caracteres em PDFs para evitar estouro de memória.
- Rate limiting por endpoint (SlowAPI) contra abuso e DoS.

> ⚠️ **Nota**: o fluxo atual realiza auto-registro automático quando um e-mail novo tenta login. Avalie se esse comportamento é adequado ao seu caso de uso antes de expor a aplicação publicamente — pode ser interessante adicionar confirmação por e-mail ou desabilitar o auto-registro em produção.

---

## ✅ Testes

```bash
python -m pytest -v
```

**19 testes unitários, 100% de aprovação (~12,5s):**

| Arquivo | Testes | Cobertura |
|---|---|---|
| `test_auth_service.py` | 4 | Registro, login, hashing, rotação de refresh token |
| `test_celery_tasks.py` | 2 | Processamento assíncrono e Dead Letter Queue |
| `test_file_parser.py` | 4 | Parsing PDF/DOCX/TXT, limites de tamanho e OCR de PDF escaneado |
| `test_ingest_service.py` | 3 | Deduplicação SHA-256 e chunking |
| `test_rag_service.py` | 4 | Sanitização de prompt injection e multitenancy |
| `test_semantic_cache.py` | 2 | Cache hit/miss isolado por tenant |

Frontend:

```bash
npx tsc --noEmit
```

0 erros de compilação TypeScript.

---

## 🖥️ Painéis e Acessos

| Painel | URL | Observação |
|---|---|---|
| Dashboard (Frontend) | http://localhost:3000 | Interface principal |
| Swagger UI (API) | http://localhost:8000/docs | Testar endpoints, autenticação Bearer, uploads |
| RabbitMQ Management | http://localhost:15672 | Login: `guest` / `guest` — monitorar filas e DLQ |

---

## 🔧 Comandos Úteis

```bash
# Logs em tempo real do worker de ingestão
docker compose logs -f celery_worker

# Reiniciar todo o ambiente do zero (limpa volumes e rebuilda)
docker compose down -v
docker compose up -d --build

# Verificar uso de memória dos containers
docker stats
```

---

## 🗺️ Roadmap

- [ ] **Re-ranking de vetores** com cross-encoder (ex: `ms-marco-MiniLM-L-6-v2`) para refinar os resultados do Qdrant antes de enviar à LLM.
- [ ] **Streaming de respostas** em tempo real (Server-Sent Events / WebSockets), com efeito de digitação no chat.
- [ ] **Persistência do histórico de conversas** no PostgreSQL, permitindo continuidade entre dispositivos.

---

## 🐳 Infraestrutura (Docker Compose)

| Serviço | Função | Porta | Limite de memória |
|---|---|---|---|
| `web` | API FastAPI | 8000 | 512M |
| `celery_worker` | Worker assíncrono | — | 768M |
| `rabbitmq` | Message broker + DLQ | 5672 / 15672 | 512M |
| `redis` | Cache semântico | 6379 | 256M |
| `qdrant` | Banco vetorial | 6333 | 1024M |
| `postgres` | Banco relacional | 5432 | 512M |

---

## 📄 Licença

Defina aqui a licença do projeto (ex: MIT, Apache 2.0, ou proprietária/uso interno).

---

<p align="center">Feito com ❤️ e bastante café ☕</p>
