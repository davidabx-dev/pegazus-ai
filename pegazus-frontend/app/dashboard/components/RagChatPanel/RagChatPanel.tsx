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
    <section className={styles.panelContainer}>
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
                  <MoreVertical className={styles.iconMenu} />
                </div>

                <div className={styles.aiContent}>{m.content}</div>

                {m.sources && m.sources.length > 0 && (
                  <div className={styles.sourcesBadge}>
                    <CheckCircle2 className={styles.iconCheck} />
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
              <div className="ai-avatar" style={{ animation: 'spin 1s linear infinite' }}>♙</div>
              <div className={styles.loadingTextRow}>
                <span>Pegazus-AI consultando base vetorial Qdrant...</span>
                <span className={styles.loadingDots}>
                  <span className={styles.dot}></span>
                  <span className={`${styles.dot} ${styles.dot2}`}></span>
                  <span className={`${styles.dot} ${styles.dot3}`}></span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer Form */}
        <form onSubmit={onSendQuery} className="composer-box">
          <div className={styles.inputInner}>
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Digite sua dúvida operacional..."
              disabled={querying}
              className={styles.chatInput}
            />
            <BarChart2 className={styles.chartIcon} />
          </div>
          <button
            type="submit"
            disabled={querying || !inputQuery.trim()}
            className="btn-send"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <span>Enviar</span>
            <Send className={styles.iconSend} />
          </button>
        </form>
      </div>
    </section>
  );
}
