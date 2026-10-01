import { supabase } from './supabaseClient';

/**
 * Status PRO validado no servidor.
 * - verify-purchase (Edge Function) confere a assinatura com o Google Play
 *   e grava em premium_status.
 * - premium_status só pode ser lida pelo app; quem escreve é o servidor.
 */

export const PREMIUM_PRODUCT_ID = 'sobcontrole_premium';

export interface ServerPremiumResult {
  isPremium: boolean;
  expiresAt: string | null;
}

/** Envia o comprovante ao servidor. Devolve null se o servidor não respondeu (rede, não configurado). */
export const verifyPurchaseOnServer = async (purchaseToken: string): Promise<ServerPremiumResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke<ServerPremiumResult & { error?: string }>('verify-purchase', {
      body: { purchaseToken, productId: PREMIUM_PRODUCT_ID },
    });
    if (error) {
      // 409: comprovante já vinculado a outra conta → não é PRO nesta conta
      if ((error as any)?.context?.status === 409) return { isPremium: false, expiresAt: null };
      console.warn('[Premium] verify-purchase falhou:', error.message);
      return null;
    }
    if (!data || typeof data.isPremium !== 'boolean') return null;
    return { isPremium: data.isPremium, expiresAt: data.expiresAt ?? null };
  } catch (err) {
    console.warn('[Premium] verify-purchase indisponível:', err);
    return null;
  }
};

/** Lê o status PRO gravado no servidor. Devolve null se não deu para ler. */
export const fetchServerPremiumStatus = async (): Promise<boolean | null> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('premium_status')
      .select('is_premium, expires_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[Premium] Erro ao ler premium_status:', error.message);
      return null;
    }
    if (!data) return false;
    return !!data.is_premium && (!data.expires_at || new Date(data.expires_at).getTime() > Date.now());
  } catch (err) {
    console.warn('[Premium] premium_status indisponível:', err);
    return null;
  }
};

/**
 * Decide o status PRO combinando a loja (Google Play) e o servidor:
 * - Assinatura ativa na loja → o servidor confere. Se o servidor não responder,
 *   confiamos na loja (quem pagou não perde o PRO por falha nossa).
 * - Sem assinatura na loja (ex.: outro aparelho/conta Google) → vale o servidor.
 */
export const resolvePremiumStatus = async (ownedInStore: boolean, purchaseToken?: string): Promise<boolean> => {
  if (ownedInStore && purchaseToken) {
    const verified = await verifyPurchaseOnServer(purchaseToken);
    return verified ? verified.isPremium : true;
  }
  return (await fetchServerPremiumStatus()) ?? ownedInStore;
};
