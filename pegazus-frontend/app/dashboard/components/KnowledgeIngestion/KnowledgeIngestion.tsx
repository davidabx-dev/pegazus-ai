'use client';

import React from 'react';
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
  return (
    <section className="lg:col-span-3 flex flex-col gap-5">
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
            onFileUpload(e.dataTransfer.files);
          }}
          className={`upload-area mt-4 mb-6 ${isDragOver ? 'border-blue-400 bg-blue-900/20' : ''}`}
        >
          <div className="icon-glow-bg"></div>

          <div className="relative z-10 flex flex-col items-center">
            <svg
              className="w-16 h-16 mb-4 text-[#8b9bb4] drop-shadow-[0_0_12px_rgba(79,130,220,0.4)]"
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

            <span className="text-white text-sm font-medium tracking-wide mb-4">Área de Upload suportados</span>

            <div className="flex flex-wrap justify-center gap-2">
              <span className="badge-item">PDF</span>
              <span className="badge-item">DOCX</span>
              <span className="badge-item">TXT</span>
              <span className="badge-item">MD</span>
              <span className="badge-item">PNG / JPG</span>
            </div>

            {uploading && <p className="text-xs text-indigo-400 mt-3 animate-pulse">Enviando e parsing OCR...</p>}
            {uploadError && <p className="text-xs text-rose-400 mt-3">{uploadError}</p>}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => onFileUpload(e.target.files)}
            multiple
            accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
            className="hidden"
          />
        </div>

        {/* Status Metrics Cards */}
        <div className="flex flex-col gap-3">
          {/* Documents Processed */}
          <div className="stat-card">
            <div className="stat-left">
              <svg className="icon-sm" viewBox="0 0 24 24">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12" y2="18.01" />
              </svg>
              <span className="text-label">Documents Processed</span>
            </div>
            <span className="text-white font-semibold text-sm">{metrics.completedDocsCount}</span>
          </div>

          {/* In Queue */}
          <div className="stat-card">
            <div className="stat-left">
              <svg className="icon-sm" viewBox="0 0 24 24">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
              <div>
                <div className="text-label">In Queue</div>
              </div>
            </div>
            <span className="text-white font-semibold text-sm">{metrics.inQueueCount}</span>
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
                <div className="text-sub">Processing</div>
              </div>
            </div>
            <div className="w-5 h-5 rounded-full bg-[#102a20] border border-[#10b981] flex items-center justify-center">
              <Check className="w-3 h-3 text-[#10b981]" />
            </div>
          </div>

          {/* Storage Used */}
          <div className="stat-card flex-col items-stretch gap-1">
            <div className="flex justify-between items-center w-full">
              <div className="stat-left">
                <svg className="icon-sm" viewBox="0 0 24 24">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
                <span className="text-label">Storage Used</span>
              </div>
              <span className="text-[#9ca8bc] font-medium text-[13px]">{metrics.estimatedStorage} MB</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.max(8, (metrics.totalChunks / 50) * 100))}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Ingestões */}
      {tasks.length > 0 && (
        <div className={styles.historyBox}>
          <span className={styles.historyTitle}>Histórico de Ingestões</span>
          {tasks.map((task) => (
            <div key={task.taskId} className={styles.historyCard}>
              <div className={styles.fileMeta}>
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className={styles.fileNameGroup}>
                  <span className={styles.filename}>{task.filename}</span>
                  <span className={styles.subText}>
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
