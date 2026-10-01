import { supabase } from './supabaseClient';

/**
 * Chamadas ao Gemini passam pela Edge Function `gemini` do Supabase,
 * que guarda a chave da API no servidor. O corpo segue o formato REST do
 * generateContent: https://ai.google.dev/api/generate-content
 */

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig?: {
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
  };
}

const MODEL = 'gemini-2.5-flash';

/** Envia a requisição ao Gemini (via servidor) e devolve o texto gerado. */
export const generateWithGemini = async (request: GeminiRequest): Promise<string> => {
  const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>('gemini', {
    body: { model: MODEL, request },
  });

  if (error) throw error;
  if (!data || data.error) throw new Error(data?.error || 'Resposta vazia da IA');
  return data.text || '';
};

/** Atalho para uma única mensagem do usuário. */
export const userContent = (...parts: GeminiPart[]): GeminiContent[] => [{ role: 'user', parts }];
