'use client';

import React from 'react';
import { FileText, MoreVertical, Trash2 } from 'lucide-react';
import { RetrievedSource } from '../../types/dashboard.types';

interface SourceCardProps {
  source: RetrievedSource;
  index: number;
  openMenuIndex: number | null;
  setOpenMenuIndex: (index: number | null) => void;
  onSelectSource: (source: RetrievedSource) => void;
  onDeleteDocument: (docName: string) => void;
}

export function SourceCard({
  source,
  index,
  openMenuIndex,
  setOpenMenuIndex,
  onSelectSource,
  onDeleteDocument,
}: SourceCardProps) {
  const scorePercent = (source.score * 100).toFixed(1);
  const docName = source.metadata?.filename || `Documento ${index + 1}`;
  const similarityScore = (source.score * 85).toFixed(0);

  return (
    <div className="source-card">
      <div className="card-content">
        {/* Card Header com Menu de 3 pontinhos & Lixeira */}
        <div className="flex items-center justify-between mb-3 relative">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText className="w-4 h-4 text-[#8b9bb4] shrink-0" />
            <span className="text-[#f3f4f6] text-[13px] font-medium tracking-wide truncate">{docName}</span>
          </div>

          <div className="relative z-30">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuIndex(openMenuIndex === index ? null : index);
              }}
              className="p-1 rounded-md hover:bg-slate-700/60 text-[#60a5fa] hover:text-white transition-all cursor-pointer"
              title="Opções"
            >
              <MoreVertical className="w-4 h-4 shrink-0" />
            </button>

            {openMenuIndex === index && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-7 z-50 min-w-[130px] bg-[#0f172a] border border-rose-500/40 rounded-xl shadow-2xl p-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  type="button"
                  onClick={() => onDeleteDocument(docName)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Excluir fonte</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Barras de Progresso */}
        <div className="progress-container">
          <span className="progress-label">RELEVANCE</span>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, Math.max(10, parseFloat(scorePercent)))}%` }}
            ></div>
          </div>
          <span className="progress-value">{scorePercent}%</span>
        </div>

        <div className="progress-container mb-2">
          <span className="progress-label">SIMILARITY</span>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, Math.max(10, parseFloat(similarityScore)))}%` }}
            ></div>
          </div>
          <span className="progress-value">{similarityScore}%</span>
        </div>

        {/* Texto Interno */}
        <div className="card-text">{source.content}</div>

        {/* Metadados / Tags */}
        <div className="metadata-row">
          <span className="tag">{source.metadata?.content_type || 'METADATA'}</span>
          {source.metadata?.filename && (
            <span className="tag truncate max-w-[120px]">{source.metadata.filename}</span>
          )}
          {source.metadata?.file_size && (
            <span className="tag">{(source.metadata.file_size / 1024).toFixed(0)} KB</span>
          )}
        </div>

        {/* Botão Ver Fonte */}
        <button onClick={() => onSelectSource(source)} className="btn-view">
          Ver fonte
        </button>
      </div>
    </div>
  );
}
