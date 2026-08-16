export interface TaskProgress {
  taskId: string;
  documentId: string;
  filename: string;
  fileSize?: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ACCEPTED';
  chunksCreated?: number;
  message?: string;
}

export interface RetrievedSource {
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: RetrievedSource[];
}
