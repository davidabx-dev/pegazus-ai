'use client';

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Message } from '../types/dashboard.types';

export function useRagQuery(authState: any) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Olá! Sou o assistente Pegazus-AI. Envie seus documentos (.pdf, .docx, .txt, .md) na coluna ao lado e faça suas perguntas operacionais!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [querying, setQuerying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, querying]);

  // RAG Query Handler
  const handleSendQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || querying) return;

    const userMessageText = inputQuery.trim();
    setInputQuery('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuerying(true);

    try {
      const data: any = await apiFetch(
        '/rag/query',
        {
          method: 'POST',
          body: JSON.stringify({ query: userMessageText, top_k: 4 }),
        },
        authState
      );

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMessage =
        err instanceof Error ? err.message : typeof err === 'object' ? JSON.stringify(err) : String(err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Não foi possível obter resposta: ${errorMessage}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setQuerying(false);
    }
  };

  return {
    messages,
    inputQuery,
    setInputQuery,
    querying,
    messagesEndRef,
    handleSendQuery,
  };
}
