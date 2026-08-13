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
          setTasks((prev) =>
            prev.map((t) =>
              t.taskId === task.taskId
                ? {
                    ...t,
                    status: data.status,
                    chunksCreated: data.chunks_created || t.chunksCreated,
                    message: data.message || t.message,
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

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const data: any = await apiFetch(
        '/ingest/upload',
        {
          method: 'POST',
          body: formData,
        },
        authState
      );

      if (data.tasks && Array.isArray(data.tasks)) {
        const newTasks: TaskProgress[] = data.tasks.map((t: any) => ({
          taskId: t.task_id,
          documentId: t.document_id,
          filename: t.filename,
          status: 'ACCEPTED',
          message: t.message,
        }));

        setTasks((prev) => [...newTasks, ...prev]);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Erro durante o upload de documento.');
    } finally {
      setUploading(false);
    }
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
