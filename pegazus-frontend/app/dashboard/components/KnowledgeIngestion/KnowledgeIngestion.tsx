'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CloudUpload, FileText, Check } from 'lucide-react';
import { TaskProgress } from '../../types/dashboard.types';
import styles from './KnowledgeIngestion.module.css';

interface KnowledgeIngestionProps {
  tasks: TaskProgress[];
  uploading: boolean;
  uploadError: string | null;
  isDragOver: boolean;
  setIsDragOver: (val: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (files: FileList | null) => void;
  metrics: {
    completedDocsCount: number;
    inQueueCount: number;
    totalChunks: number;
    estimatedStorage: string;
    storagePercent?: number;
  };
}

export function KnowledgeIngestion({
  tasks,
  uploading,
  uploadError,
  isDragOver,
  setIsDragOver,
  fileInputRef,
  onFileUpload,
  metrics,
}: KnowledgeIngestionProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const prevUploadingRef = useRef(uploading);

  useEffect(() => {
    // Quando o upload termina com sucesso, exibe o check verde por 3.5s e depois volta ao estado neutro
    if (prevUploadingRef.current && !uploading && !uploadError) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
    prevUploadingRef.current = uploading;
  }, [uploading, uploadError]);

  return (
    <section className={styles.sectionContainer}>
      <div className="main-panel max-w-none">
        <h2 className={styles.sectionTitle}>Ingestão de Conhecimento</h2>

        {/* Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files) {
              onFileUpload(e.dataTransfer.files);
            }
          }}
          className="upload-area"
        >
          <div className="icon-glow-bg"></div>

          <div className={styles.uploadContent}>
            <svg
              className={styles.uploadCloudIcon}
              viewBox="0 0 64 64"
              fill="none"
            >
              <path
                d="M32 12C21 12 14 20 14 28C10 28 6 32 6 38C6 44 11 48 18 48H46C53 48 58 43 58 37C58 31 53 26 47 26C45 18 39 12 32 12Z"
                fill="url(#cloud-grad)"
                fillOpacity="0.15"
                stroke="url(#cloud-grad)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M26 36L32 30L38 36M32 30V44"
                stroke="#60a5fa"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="cloud-grad" x1="6" y1="12" x2="58" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#60a5fa" />
                  <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>

            <span className={styles.uploadTitle}>Área de Upload suportados</span>

            <div className={styles.badgesRow}>
              <span className="badge-item">PDF</span>
              <span className="badge-item">DOCX</span>
              <span className="badge-item">TXT</span>
              <span className="badge-item">MD</span>
              <span className="badge-item">PNG / JPG</span>
            </div>

            {uploading && <p className={styles.uploadingText}>Enviando e parsing OCR...</p>}
            {uploadError && <p className={styles.uploadErrorText}>{uploadError}</p>}
          </div>

          <input
            type="file"
            ref={fileInputRef as any}
            onChange={(e) => onFileUpload(e.target.files)}
            multiple
            accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
            className={styles.hiddenInput}
          />
        </div>

        {/* Status Metrics Cards */}
        <div className={styles.statCardsGroup}>
          {/* Documents Processed */}
          <div className="stat-card">
            <div className="stat-left">
              <FileText className="icon-sm" />
              <div>
                <div className="text-label">Documents Processed</div>
              </div>
            </div>
            <span className={styles.statValue}>{metrics.completedDocsCount}</span>
          </div>

          {/* In Queue */}
          <div className="stat-card">
            <div className="stat-left">
              <svg className="icon-sm" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div>
                <div className="text-label">In Queue</div>
              </div>
            </div>
            <span className={styles.statValue}>{metrics.inQueueCount}</span>
          </div>

          {/* Status */}
          <div className="stat-card">
            <div className="stat-left">
              <svg className="icon-sm" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="8.01" />
              </svg>
              <div>
                <div className="text-label">Status</div>
                <div className="text-sub">
                  {uploading
                    ? 'Processando...'
                    : showSuccess
                    ? 'Concluído!'
                    : 'Aguardando'}
                </div>
              </div>
            </div>
            {uploading ? (
              <div className={styles.statusProcessingCircle} title="Processando arquivo...">
                <div className={styles.statusSpinner}></div>
              </div>
            ) : showSuccess ? (
              <div className={styles.statusCompletedCircle} title="Arquivo indexado com sucesso!">
                <Check className={styles.checkIcon} />
              </div>
            ) : (
              <div className={styles.statusIdleCircle} title="Aguardando novo envio">
                <div className={styles.statusIdleDot}></div>
              </div>
            )}
          </div>

          {/* Storage Used */}
          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
            <div className={styles.storageHeader}>
              <div className="stat-left">
                <svg className="icon-sm" viewBox="0 0 24 24">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
                <span className="text-label">Storage Used</span>
              </div>
              <span className={styles.storageValue}>{metrics.estimatedStorage} MB</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${metrics.storagePercent !== undefined ? metrics.storagePercent : 0}%`,
                  transition: 'width 0.5s ease-in-out',
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Ingestões */}
      {tasks.length > 0 && (
        <div className={styles.historyBox}>
          <span className={styles.historyTitle}>Histórico de Ingestões ({tasks.length})</span>
          {tasks.map((task) => (
            <div key={task.taskId} className={styles.historyCard}>
              <div className={styles.fileMeta}>
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className={styles.fileNameGroup}>
                  <span className={styles.filename}>{task.filename}</span>
                  <span className={styles.subText}>
                    {task.fileSize ? `${(task.fileSize / 1024).toFixed(0)} KB • ` : ''}
                    {task.chunksCreated ? `${task.chunksCreated} chunks` : task.message}
                  </span>
                </div>
              </div>
              <span
                className={
                  task.status === 'COMPLETED'
                    ? styles.statusBadgeCompleted
                    : task.status === 'FAILED'
                    ? styles.statusBadgeFailed
                    : styles.statusBadgePending
                }
              >
                {task.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
