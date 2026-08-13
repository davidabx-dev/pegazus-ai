'use client';

import React from 'react';
import { MoreVertical, CheckCircle2, BarChart2, Send } from 'lucide-react';
import { Message } from '../../types/dashboard.types';
import styles from './RagChatPanel.module.css';

interface RagChatPanelProps {
  messages: Message[];
  inputQuery: string;
  setInputQuery: (val: string) => void;
  querying: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendQuery: (e: React.FormEvent) => void;
}

export function RagChatPanel({
  messages,
  inputQuery,
  setInputQuery,
  querying,
  messagesEndRef,
  onSendQuery,
}: RagChatPanelProps) {
  return (
    <section className="lg:col-span-5 flex flex-col gap-5">
      <div className={styles.panelRag}>
        <h2 className={styles.panelTitle}>Painel de Consulta RAG</h2>

        {/* Chat Inner Box */}
        <div className={styles.chatInnerBox}>
          {messages.map((m) =>
            m.role === 'user' ? (
              // User Message Bubble
              <div key={m.id} className={styles.userMessageWrapper}>
                <div className="user-bubble">{m.content}</div>
                <span className={styles.userMeta}>User • {m.timestamp}</span>
              </div>
            ) : (
              // Assistant AI Card
              <div key={m.id} className={`${styles.aiCardWrapper} ai-card`}>
                <div className={styles.aiHeader}>
                  <div className={styles.aiHeaderLeft}>
                    <div className="ai-avatar">♙</div>
                    <div>
                      <div className={styles.aiNameRow}>
                        <span className={styles.aiName}>Pegazus-AI</span>
                        <span className="online-badge">online</span>
                      </div>
                      <span className={styles.aiSubtext}>RAG Engine • {m.timestamp}</span>
                    </div>
                  </div>
                  <MoreVertical className="w-4 h-4 text-[#8d99af] cursor-pointer" />
                </div>

                <div className={styles.aiContent}>{m.content}</div>

                {m.sources && m.sources.length > 0 && (
                  <div className={styles.sourcesBadge}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#35d9ff]" />
                    <span>
                      {new Set(m.sources.map((s) => s.metadata?.filename || s.metadata?.document_id || s.content)).size}{' '}
                      documento(s) recuperado(s) e verificado(s) no Qdrant
                    </span>
                  </div>
                )}
              </div>
            )
          )}

          {/* Loading / Typing Indicator */}
          {querying && (
            <div className={`${styles.loadingCard} ai-card`}>
              <div className="ai-avatar animate-spin">♙</div>
              <div className="flex items-center gap-2 text-xs text-[#86eaff]">
                <span>Pegazus-AI consultando base vetorial Qdrant...</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#86eaff] animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#86eaff] animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#86eaff] animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer Form */}
        <form onSubmit={onSendQuery} className="composer-box">
          <div className="relative flex-1 flex items-center bg-[#0f141f] border border-[#8690a6]/40 rounded-lg px-3 py-2 shadow-inner">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Digite sua dúvida operacional..."
              disabled={querying}
              className="w-full bg-transparent text-xs text-[#d9deea] placeholder-[#777e8e] focus:outline-none"
            />
            <BarChart2 className="w-4 h-4 text-[#788396] shrink-0" />
          </div>
          <button
            type="submit"
            disabled={querying || !inputQuery.trim()}
            className="btn-send flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Enviar</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </section>
  );
}
