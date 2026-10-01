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

/** Recurso que está usando a IA. O servidor aplica um limite diário por recurso. */
export type AiFeature = 'chat' | 'categorize' | 'receipt' | 'statement';

/** O usuário atingiu o limite diário deste recurso (ou é recurso PRO). */
export class AiLimitError extends Error {
  constructor(public feature: AiFeature) {
    super('Limite diário de uso da IA atingido');
    this.name = 'AiLimitError';
  }
}

/** Envia a requisição ao Gemini (via servidor) e devolve o texto gerado. */
export const generateWithGemini = async (request: GeminiRequest, feature: AiFeature): Promise<string> => {
  const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>('gemini', {
    body: { model: MODEL, feature, request },
  });

  if (error) {
    if ((error as any)?.context?.status === 429) throw new AiLimitError(feature);
    throw error;
  }
  if (!data || data.error) throw new Error(data?.error || 'Resposta vazia da IA');
  return data.text || '';
};

/** Atalho para uma única mensagem do usuário. */
export const userContent = (...parts: GeminiPart[]): GeminiContent[] => [{ role: 'user', parts }];
