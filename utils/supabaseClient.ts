// utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Access variables via process.env (injected by Vite config) to avoid import.meta.env issues
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if variables are effectively present (not undefined, null, or empty string)
const isConfigured = supabaseUrl && supabaseAnonKey;

if (!isConfigured) {
  console.warn(
    '[SupabaseClient] Supabase URL ou ANON KEY não configurados. ' +
      'A sincronização de dados será desativada. ' +
      'Verifique seu arquivo .env.local (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).'
  );
}

// Mesmo se faltar, criamos o client com valores placeholder para não quebrar o build/runtime com erro "supabaseUrl is required";
// As chamadas falharão graciosamente ou serão tratadas por quem importa.
import { Capacitor } from '@capacitor/core';

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Na web: detecta o token na URL após o redirect OAuth do Google
      // No Android nativo: o Capacitor lida com deeplinks, então deve ser false
      detectSessionInUrl: !Capacitor.isNativePlatform(),
      storage: window.localStorage,
    },
  }
);

