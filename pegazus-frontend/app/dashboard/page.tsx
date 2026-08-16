'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FileText, X } from 'lucide-react';
import { RetrievedSource } from './types/dashboard.types';
import { useIngestionStatus } from './hooks/useIngestionStatus';
import { useRagQuery } from './hooks/useRagQuery';
import { Header } from './components/Header/Header';
import { KnowledgeIngestion } from './components/KnowledgeIngestion/KnowledgeIngestion';
import { RagChatPanel } from './components/RagChatPanel/RagChatPanel';
import { VectorSourcesPanel } from './components/VectorSourcesPanel/VectorSourcesPanel';

export default function DashboardPage() {
  const { isAuthenticated, isInitialized, userEmail, logout, accessToken, refreshToken, updateTokens } = useAuth();
  const router = useRouter();

  const authState = { accessToken, refreshToken, updateTokens, logout };

  // Auth Protection - Só redireciona se já inicializou e NÃO está autenticado
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/login');
    }
  }, [isInitialized, isAuthenticated, router]);

  // Hooks
  const ingestion = useIngestionStatus(authState);
  const rag = useRagQuery(authState);

  // Modal State
  const [selectedSource, setSelectedSource] = useState<RetrievedSource | null>(null);

  // Fontes Vetoriais Acumuladas & Sincronizadas com o Histórico de Ingestões
  const allAssistantSources = React.useMemo(() => {
    const sources: RetrievedSource[] = [];
    rag.messages.forEach((m) => {
      if (m.role === 'assistant' && m.sources && m.sources.length > 0) {
        sources.push(...m.sources);
      }
    });
    return sources;
  }, [rag.messages]);

  const activeSources = React.useMemo(() => {
    const uniqueDocsMap = new Map<string, RetrievedSource>();

    // 1. Adicionar fontes resultantes de consultas RAG
    for (const src of allAssistantSources) {
      const docKey = (src.metadata?.filename || src.metadata?.document_id || src.content || '').trim();
      if (!docKey) continue;
      if (ingestion.deletedDocKeys.some((d) => d === docKey || docKey.includes(d) || d.includes(docKey))) {
        continue;
      }
      if (!uniqueDocsMap.has(docKey)) {
        uniqueDocsMap.set(docKey, src);
      } else {
        const existing = uniqueDocsMap.get(docKey)!;
        if (src.score > existing.score) {
          uniqueDocsMap.set(docKey, src);
        }
      }
    }

    // 2. Sincronizar com os arquivos do Histórico de Ingestões (tasks)
    const validTasks = ingestion.tasks.filter((t) => t.status !== 'FAILED');
    for (const task of validTasks) {
      if (!task.filename) continue;
      const taskKey = task.filename.trim();
      if (ingestion.deletedDocKeys.some((d) => d === taskKey || taskKey.includes(d) || d.includes(taskKey))) {
        continue;
      }

      let existingKey = Array.from(uniqueDocsMap.keys()).find(
        (k) => k === taskKey || k.includes(taskKey) || taskKey.includes(k)
      );

      if (!existingKey) {
        uniqueDocsMap.set(taskKey, {
          content: `Documento "${task.filename}" indexado no banco vetorial Qdrant. Disponível para busca semântica e respostas RAG.`,
          score: 0.9,
          metadata: {
            filename: task.filename,
            content_type: 'application/pdf',
            chunk_id: task.chunksCreated || 1,
            file_size: 102400,
          },
        });
      }
    }

    return Array.from(uniqueDocsMap.values());
  }, [allAssistantSources, ingestion.tasks, ingestion.deletedDocKeys]);

  if (!isAuthenticated) return null;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <Header userEmail={userEmail} onLogout={logout} />

      {/* Main 3-Column Layout */}
      <main className="dashboard-main-grid">
        {/* Coluna Esquerda: Ingestão de Conhecimento */}
        <KnowledgeIngestion
          tasks={ingestion.tasks}
          uploading={ingestion.uploading}
          uploadError={ingestion.uploadError}
          isDragOver={ingestion.isDragOver}
          setIsDragOver={ingestion.setIsDragOver}
          fileInputRef={ingestion.fileInputRef}
          onFileUpload={ingestion.handleFileUpload}
          metrics={ingestion.metrics}
        />

        {/* Coluna Central: Painel de Consulta RAG */}
        <RagChatPanel
          messages={rag.messages}
          inputQuery={rag.inputQuery}
          setInputQuery={rag.setInputQuery}
          querying={rag.querying}
          messagesEndRef={rag.messagesEndRef}
          onSendQuery={rag.handleSendQuery}
        />

        {/* Coluna Direita: Fontes Vetoriais Recuperadas */}
        <VectorSourcesPanel
          sources={activeSources}
          onSelectSource={(source) => setSelectedSource(source)}
          onDeleteDocument={ingestion.handleDeleteDocument}
        />
      </main>

      {/* MODAL DE VISUALIZAÇÃO DE FONTE COMPLETA */}
      {selectedSource && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-badge">
                  <FileText className="icon-sm" />
                </div>
                <div>
                  <h3 className="modal-title">
                    {selectedSource.metadata?.filename || 'Trecho do Documento'}
                  </h3>
                  <span className="modal-score">
                    Relevância Vetorial: {(selectedSource.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSource(null)}
                className="modal-close-btn"
              >
                <X className="icon-sm" />
              </button>
            </div>

            <div className="modal-content-box">
              {selectedSource.content}
            </div>

            {selectedSource.metadata && Object.keys(selectedSource.metadata).length > 0 && (
              <div className="modal-meta-section">
                <span className="modal-meta-title">Metadados Adicionais:</span>
                <div className="modal-meta-tags">
                  {Object.entries(selectedSource.metadata).map(([k, v]) => (
                    <span key={k} className="modal-meta-tag">
                      <strong>{k}:</strong> {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
