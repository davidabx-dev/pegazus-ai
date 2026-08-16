import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Pegazus-AI | Dashboard RAG',
  description: 'Plataforma RAG Enterprise com processamento assíncrono, busca vetorial e inteligência estratégica.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="app-body">
        {/* Animação de Vídeo em Loop de Fundo */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="bg-video-loop"
        >
          <source src="/background_loop.mp4" type="video/mp4" />
        </video>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

