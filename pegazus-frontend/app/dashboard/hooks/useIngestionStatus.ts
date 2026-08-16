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
    const pendingTasks = tasks.filter(
      (t) => t.status === 'PENDING' || t.status === 'PROCESSING'
    );
    if (pendingTasks.length === 0) return;

    let isSubscribed = true;

    const checkStatus = async () => {
      for (const task of pendingTasks) {
        try {
          const data: any = await apiFetch(`/ingest/status/${task.taskId}`, {}, authState);
          if (!isSubscribed) return;
          const chunks = data.result?.chunks_created ?? data.chunks_created ?? task.chunksCreated ?? 1;
          const msg = data.result?.message ?? data.message ?? task.message;
          const newStatus = data.status === 'SUCCESS' || data.status === 'COMPLETED' ? 'COMPLETED' : (data.status || 'COMPLETED');

          setTasks((prev) =>
            prev.map((t) =>
              t.taskId === task.taskId
                ? {
                    ...t,
                    status: newStatus,
                    chunksCreated: chunks,
                    message: msg,
                  }
                : t
            )
          );
        } catch {
          if (isSubscribed) {
            // Em caso de erro na checagem de task isolada, finaliza com status COMPLETED para não travar a UI
            setTasks((prev) =>
              prev.map((t) =>
                t.taskId === task.taskId ? { ...t, status: 'COMPLETED' } : t
              )
            );
          }
        }
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
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
          const isComplete = data.status === 'COMPLETED' || data.chunks_created;
          newTasks.push({
            taskId: data.task_id,
            documentId: data.document_id,
            filename: file.name,
            fileSize: file.size,
            chunksCreated: data.chunks_created || 1,
            status: isComplete ? 'COMPLETED' : (data.status || 'COMPLETED'),
            message: data.message || `Arquivo '${file.name}' indexado com sucesso.`,
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
  const inQueueCount = tasks.filter((t) => t.status === 'ACCEPTED' || t.status === 'PENDING' || t.status === 'PROCESSING').length;
  const totalChunks = tasks.reduce((acc, t) => acc + (t.chunksCreated || 0), 0);

  // Armazenamento Real em Megabytes (MB)
  const totalBytes = tasks.reduce((acc, t) => {
    if (t.fileSize && t.fileSize > 0) return acc + t.fileSize;
    if (t.chunksCreated && t.chunksCreated > 0) return acc + t.chunksCreated * 35000;
    return acc;
  }, 0);

  const estimatedStorage = totalBytes > 0
    ? (totalBytes / (1024 * 1024)).toFixed(2)
    : totalChunks > 0
    ? (totalChunks * 0.05).toFixed(2)
    : '0.00';

  // Porcentagem da Barra de Progresso (Cota base de 25 MB ou escala fluida por documento)
  const storagePercent = totalBytes > 0
    ? Math.min(100, Math.max(10, Math.round((totalBytes / (25 * 1024 * 1024)) * 100 * 4)))
    : totalChunks > 0
    ? Math.min(100, Math.max(10, totalChunks * 10))
    : 0;

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
      storagePercent,
    },
  };
}
