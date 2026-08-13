'use client';

import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { RetrievedSource } from '../../types/dashboard.types';
import { SourceCard } from './SourceCard';
import styles from './VectorSourcesPanel.module.css';

interface VectorSourcesPanelProps {
  sources: RetrievedSource[];
  onSelectSource: (source: RetrievedSource) => void;
  onDeleteDocument: (docName: string) => void;
}

export function VectorSourcesPanel({
  sources,
  onSelectSource,
  onDeleteDocument,
}: VectorSourcesPanelProps) {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

  return (
    <section className="lg:col-span-4 flex flex-col gap-5">
      <div className="main-panel max-w-none h-[640px] flex flex-col relative overflow-hidden">
        <h2 className={styles.panelTitle}>
          Fontes Vetoriais Recuperadas {sources.length > 0 && `(${sources.length})`}
        </h2>

        {sources.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <p className={styles.emptyTitle}>Nenhuma fonte recuperada ainda</p>
            <p className={styles.emptySubtitle}>
              Faça uma pergunta no chat RAG para visualizar os trechos de documentos relevantes buscados no banco Qdrant.
            </p>
          </div>
        ) : (
          <div className="scroll-container relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sources.map((src, index) => (
                <SourceCard
                  key={index}
                  source={src}
                  index={index}
                  openMenuIndex={openMenuIndex}
                  setOpenMenuIndex={setOpenMenuIndex}
                  onSelectSource={onSelectSource}
                  onDeleteDocument={onDeleteDocument}
                />
              ))}
            </div>
          </div>
        )}

        {/* Ícone decorativo de Estrela 4 pontas no canto inferior direito */}
        <svg className="corner-star text-indigo-400/40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
        </svg>
      </div>
    </section>
  );
}
