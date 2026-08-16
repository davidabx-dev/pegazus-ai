'use client';

import React from 'react';
import { FileText, MoreVertical, Trash2 } from 'lucide-react';
import { RetrievedSource } from '../../types/dashboard.types';
import styles from './VectorSourcesPanel.module.css';

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
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <FileText className={styles.docIcon} />
            <span className={styles.docTitle}>{docName}</span>
          </div>

          <div className={styles.optionsWrap}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuIndex(openMenuIndex === index ? null : index);
              }}
              className={styles.btnOptions}
              title="Opções"
            >
              <MoreVertical style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
            </button>

            {openMenuIndex === index && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={styles.dropdownMenu}
              >
                <button
                  type="button"
                  onClick={() => onDeleteDocument(docName)}
                  className={styles.btnDelete}
                >
                  <Trash2 className={styles.trashIcon} />
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

        <div className="progress-container" style={{ marginBottom: '8px' }}>
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
            <span className={`tag ${styles.tagFilename}`}>{source.metadata.filename}</span>
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
