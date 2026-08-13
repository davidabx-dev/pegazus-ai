'use client';

import React from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  userEmail: string | null;
  onLogout: () => void;
}

export function Header({ userEmail, onLogout }: HeaderProps) {
  return (
    <header className={styles.headerContainer}>
      <div className={styles.brand}>
        {/* Logo de Pegasus desenhada em SVG */}
        <svg className={styles.logo} viewBox="0 0 80 80" aria-label="Pegazus">
          <defs>
            <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d4d0ff" />
              <stop offset="0.45" stopColor="#aaa4ff" />
              <stop offset="1" stopColor="#706ab8" />
            </linearGradient>
            <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#c9c4ff" />
              <stop offset="1" stopColor="#827bd0" />
            </linearGradient>
          </defs>

          {/* Asas */}
          <path d="M36 31C27 26 17 18 9 8c10 5 19 8 28 9-8-6-14-12-18-17 12 4 22 10 29 19z" fill="url(#wing)" />
          <path d="M38 28C29 19 21 10 18 3c13 6 25 14 32 24z" fill="#9690e8" opacity="0.85" />
          <path d="M39 29C31 17 28 9 27 2c10 8 18 17 22 28z" fill="#7770c4" opacity="0.72" />

          {/* Pescoço / Cabeça */}
          <path d="M37 34c5-9 13-13 21-12l8 4-7 3 5 4-11 2-5 8-8-1z" fill="url(#body)" />

          {/* Corpo */}
          <path d="M34 34c8 4 13 10 16 17-6 8-14 13-25 17 3-8 4-14 3-20-3 4-7 7-12 9 5-10 9-17 18-23z" fill="url(#body)" />

          {/* Pernas */}
          <path d="M34 57l-5 15h-4l3-17zM44 56l7 13-3 2-9-13z" fill="#8b84d5" />

          {/* Brilho */}
          <path
            d="M14 11c8 5 15 8 24 10"
            fill="none"
            stroke="rgba(255,255,255,.48)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>

        <span className={styles.brandName}>Pegazus-AI</span>
      </div>

      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.user}`} id="userBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5.5 19c.8-3.2 2.9-5 6.5-5s5.7 1.8 6.5 5" />
          </svg>
          <span className="truncate max-w-[120px]">{userEmail ? userEmail.split('@')[0] : 'Usuario'}</span>
          <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <button onClick={onLogout} className={`${styles.btn} ${styles.exit}`}>
          Sair
        </button>
      </div>
    </header>
  );
}
