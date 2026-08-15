'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { TaskProgress } from '../types/dashboard.types';

export function useIngestionStatus(authState: any) {
  const [tasks, setTasks] = useState<TaskProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletedDocKeys, setDeletedDocKeys] = useState<string[]>([]);

  // Task Status Polling Loop
  useEffect(() => {
    const pendingTasks = tasks.filter((t) => t.status === 'PENDING' || t.status === 'ACCEPTED');
    if (pendingTasks.length === 0) return;

    const interval = setInterval(async () => {
      for (const task of pendingTasks) {
        try {
          const data: any = await apiFetch(`/ingest/status/${task.taskId}`, {}, authState);
          const chunks = data.result?.chunks_created ?? data.chunks_created ?? task.chunksCreated;
          const msg = data.result?.message ?? data.message ?? task.message;
          setTasks((prev) =>
            prev.map((t) =>
              t.taskId === task.taskId
                ? {
                    ...t,
                    status: data.status,
                    chunksCreated: chunks,
                    message: msg,
                  }
                : t
            )
          );
        } catch (err) {
          console.error(`Erro ao verificar status da task ${task.taskId}:`, err);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [tasks, authState]);

  // File Upload Handler
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    const fileList = Array.from(files);
    const newTasks: TaskProgress[] = [];

    for (const file of fileList) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const data: any = await apiFetch(
          '/ingest/file',
          {
            method: 'POST',
            body: formData,
          },
          authState
        );

        if (data && data.task_id) {
          newTasks.push({
            taskId: data.task_id,
            documentId: data.document_id,
            filename: file.name,
            status: data.status || 'ACCEPTED',
            message: data.message || `Arquivo '${file.name}' em processamento.`,
          });
        }
      } catch (err: any) {
        setUploadError(err.message || `Erro durante o upload do arquivo ${file.name}.`);
      }
    }

    if (newTasks.length > 0) {
      setTasks((prev) => [...newTasks, ...prev]);
    }
    setUploading(false);
  };

  // Document Delete Handler
  const handleDeleteDocument = (docName: string) => {
    const trimmed = docName.trim();
    setDeletedDocKeys((prev) => [...prev, trimmed]);
    setTasks((prev) => prev.filter((t) => t.filename.trim() !== trimmed));
  };

  // Metrics Calculations
  const completedDocsCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const inQueueCount = tasks.filter((t) => t.status === 'ACCEPTED' || t.status === 'PENDING').length;
  const totalChunks = tasks.reduce((acc, t) => acc + (t.chunksCreated || 0), 0);
  const estimatedStorage = (totalChunks * 0.005).toFixed(2);

  return {
    tasks,
    uploading,
    uploadError,
    isDragOver,
    setIsDragOver,
    fileInputRef,
    deletedDocKeys,
    handleFileUpload,
    handleDeleteDocument,
    metrics: {
      completedDocsCount,
      inQueueCount,
      totalChunks,
      estimatedStorage,
    },
  };
}
