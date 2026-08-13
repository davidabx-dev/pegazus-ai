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
  const { isAuthenticated, userEmail, logout, accessToken, refreshToken, updateTokens } = useAuth();
  const router = useRouter();

  const authState = { accessToken, refreshToken, updateTokens, logout };

  // Auth Protection
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

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
    <div className="flex flex-col min-h-screen justify-between p-4 md:p-6 max-w-[1720px] mx-auto w-full">
      {/* Header */}
      <Header userEmail={userEmail} onLogout={logout} />

      {/* Main 3-Column Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl max-w-2xl w-full p-6 border border-white/20 shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {selectedSource.metadata?.filename || 'Trecho do Documento'}
                  </h3>
                  <span className="text-xs text-indigo-300 font-semibold">
                    Relevância Vetorial: {(selectedSource.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSource(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4 text-slate-200 text-sm leading-relaxed max-h-[350px] overflow-y-auto whitespace-pre-wrap">
              {selectedSource.content}
            </div>

            {selectedSource.metadata && Object.keys(selectedSource.metadata).length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Metadados Adicionais:</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedSource.metadata).map(([k, v]) => (
                    <span key={k} className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/10 text-xs text-slate-300">
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
