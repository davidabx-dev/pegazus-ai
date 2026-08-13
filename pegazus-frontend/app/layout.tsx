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
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="text-slate-200 min-h-screen p-4 md:p-6 flex flex-col justify-between overflow-x-hidden relative">
        {/* Animação de Vídeo em Loop de Fundo */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover pointer-events-none z-[-1]"
        >
          <source src="/background_loop.mp4" type="video/mp4" />
        </video>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

