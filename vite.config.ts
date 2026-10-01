import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega explicitamente do diretório raiz (.)
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    plugins: [react()],
    base: './',

    define: {
      // Mapeia as variáveis para process.env (usado pelo Supabase e login Google).
      // A chave do Gemini NÃO entra aqui: ela fica só na Edge Function `gemini` do Supabase.
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'process.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID),
    },

    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },

    // No app publicado, remove console.log/info/debug: eles mostravam dados do usuário
    // (e-mail, resumo das finanças) no logcat do Android. warn/error continuam.
    esbuild: mode === 'production'
      ? { pure: ['console.log', 'console.info', 'console.debug', 'console.group', 'console.groupEnd'] }
      : undefined,
  };
});