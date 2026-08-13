'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  login: (access: string, refresh: string, email?: string) => void;
  logout: () => void;
  updateTokens: (access: string, refresh: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const savedAccess = localStorage.getItem('pegazus_access_token');
      const savedRefresh = localStorage.getItem('pegazus_refresh_token');
      const savedEmail = localStorage.getItem('pegazus_user_email');
      if (savedAccess) {
        setAccessToken(savedAccess);
        setRefreshToken(savedRefresh || null);
        setUserEmail(savedEmail || 'demo@pegazus.ai');
      }
    } catch (e) {
      console.error('Erro ao ler tokens do localStorage:', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const login = (access: string, refresh: string, email?: string) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    if (email) setUserEmail(email);
    try {
      localStorage.setItem('pegazus_access_token', access);
      localStorage.setItem('pegazus_refresh_token', refresh);
      if (email) localStorage.setItem('pegazus_user_email', email);
    } catch (e) {
      console.error('Erro ao salvar tokens no localStorage:', e);
    }
  };

  const updateTokens = (access: string, refresh: string) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    try {
      localStorage.setItem('pegazus_access_token', access);
      localStorage.setItem('pegazus_refresh_token', refresh);
    } catch (e) {
      console.error('Erro ao atualizar tokens no localStorage:', e);
    }
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUserEmail(null);
    try {
      localStorage.removeItem('pegazus_access_token');
      localStorage.removeItem('pegazus_refresh_token');
      localStorage.removeItem('pegazus_user_email');
    } catch (e) {
      console.error('Erro ao remover tokens do localStorage:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        userEmail,
        isAuthenticated: !!accessToken || (!isInitialized ? true : false),
        login,
        logout,
        updateTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
