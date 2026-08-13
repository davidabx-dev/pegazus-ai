# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir --upgrade pip wheel && \
    pip install --no-cache-dir .

# Stage 2: Runner
FROM python:3.11-slim as runner

WORKDIR /app

# Criar usuario nao-root para seguranca
RUN useradd -m -u 1000 appuser

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

# Alterar permissao do diretorio para appuser
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "pegazus_ai.main:app", "--host", "0.0.0.0", "--port", "8000"]
