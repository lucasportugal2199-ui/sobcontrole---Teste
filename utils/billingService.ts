import { Capacitor } from '@capacitor/core';
import { store, ProductType, Platform } from 'capacitor-plugin-cdv-purchase';
import { resolvePremiumStatus } from './premiumService';

/**
 * BillingService - Integração real com o faturamento do Google Play (Google Play Billing API)
 * usando o plugin capacitor-plugin-cdv-purchase.
 */

export interface PurchaseResult {
    success: boolean;
    /** purchaseToken do Google Play (usado para validar no servidor) */
    receipt?: string;
    error?: string;
}

/** Chamado quando o status da assinatura na loja muda. O token permite validar no servidor. */
export type BillingStateCallback = (ownedInStore: boolean, purchaseToken?: string) => void;

// Armazena os callbacks da promise de compra ativa
let activePurchaseResolver: ((result: PurchaseResult) => void) | null = null;
let isInitialized = false;

export const BillingService = {
    /**
     * Identificadores de produtos configurados no Google Play Console
     */
    PRODUCTS: {
        SUB_ID: 'sobcontrole_premium',
        MONTHLY: 'sobcontrole_premium@sobcontrole-premium',
        ANNUAL: 'sobcontrole_premium@sobcontrole-premium-anual'
    },

    /**
     * Inicializa a loja de compras (Google Play Store) e configura os listeners de transações
     */
    async initialize(
        onStateChange?: BillingStateCallback,
        showToast?: (msg: string, type: 'success' | 'error') => void
    ): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            console.log("[Billing] Rodando em plataforma Web. Simulação de faturamento ativada.");
            return;
        }

        if (isInitialized) {
            console.log("[Billing] Serviço já inicializado anteriormente.");
            return;
        }

        console.log("[Billing] Inicializando faturamento nativo do Google Play...");

        try {
            // 1. Registrar os produtos configurados no Play Console
            store.register([
                {
                    id: this.PRODUCTS.SUB_ID,
                    type: ProductType.PAID_SUBSCRIPTION,
                    platform: Platform.GOOGLE_PLAY
                }
            ]);

            // 2. Configurar os callbacks de ciclo de vida das transações
            store.when()
                .approved((transaction: any) => {
                    console.log(`[Billing] Transação aprovada para: ${transaction.productId}. Solicitando validação...`);
                    // Solicita verificação da transação (local ou remota)
                    transaction.verify();
                })
                .verified((receipt: any) => {
                    console.log(`[Billing] Recibo verificado com sucesso para:`, receipt);
                    
                    // IMPORTANTE: Finaliza a transação com a loja para que o Google saiba
                    // que o produto foi entregue. Caso contrário, a compra é reembolsada automaticamente após 3 dias.
                    receipt.finish();

                    const purchaseToken: string | undefined = receipt.sourceReceipt?.purchaseToken;

                    // Atualiza o estado da aplicação (o App confere com o servidor)
                    if (onStateChange) {
                        onStateChange(true, purchaseToken);
                    }

                    // Se houver uma Promise de compra pendente na interface, resolve com sucesso
                    if (activePurchaseResolver) {
                        activePurchaseResolver({
                            success: true,
                            receipt: purchaseToken
                        });
                        activePurchaseResolver = null;
                    }
                })
                .finished((transaction: any) => {
                    console.log(`[Billing] Transação finalizada com sucesso na Play Store: ${transaction.id}`);
                });

            // 3. Inicializa o plugin de fato
            await store.initialize();
            console.log("[Billing] Plugin store inicializado com sucesso.");

            // 4. Atualiza os dados locais de produtos e compras a partir da Google Play Store
            await store.update();
            isInitialized = true;

            // 5. Verifica se o usuário já possui alguma assinatura ativa cadastrada localmente na conta dele
            const isUserPremium = store.owned(this.PRODUCTS.SUB_ID);

            console.log(`[Billing] Status das Assinaturas: Premium=${isUserPremium}`);

            if (onStateChange) {
                onStateChange(isUserPremium, this.getOwnedPurchaseToken());
            }

        } catch (err: any) {
            console.error("[Billing] Erro fatal durante a inicialização do faturamento:", err);
            if (showToast) {
                showToast("Não foi possível conectar ao Google Play Billing.", "error");
            }
        }
    },

    /**
     * Inicia o fluxo de compra/assinatura de um plano
     */
    async requestPurchase(productId: string): Promise<PurchaseResult> {
        console.log(`[Billing] Iniciando fluxo de compra para: ${productId}`);

        if (!Capacitor.isNativePlatform()) {
            // Fora do Android a compra só pode ser simulada no `npm run dev`.
            // Em qualquer outro build, recusa: senão qualquer um liberaria o PRO de graça.
            if (!import.meta.env.DEV) {
                return { success: false, error: "Assinaturas disponíveis apenas no app Android." };
            }

            // No ambiente de desenvolvimento, exibimos um confirm para simular a compra
            return new Promise((resolve) => {
                const confirmPurchase = window.confirm(
                    `[SIMULAÇÃO WEB - DESENVOLVIMENTO]\n\nDeseja simular a aprovação da assinatura do produto:\n${productId}?\n\n` +
                    `Clique em OK para simular SUCESSO e liberar o PRO.\n` +
                    `Clique em CANCELAR para simular FALHA/CANCELAMENTO.`
                );

                setTimeout(() => {
                    if (confirmPurchase) {
                        resolve({
                            success: true,
                            receipt: `SIMULATED_WEB_${Date.now()}`
                        });
                    } else {
                        resolve({
                            success: false,
                            error: "Simulação de compra cancelada ou rejeitada na Web."
                        });
                    }
                }, 1000);
            });
        }

        // Fluxo Nativo com Google Play
        return new Promise((resolve) => {
            // Vincula o resolver para ser disparado nos callbacks globais do plugin
            activePurchaseResolver = resolve;

            try {
                // Se o ID do produto contiver o padrão 'productId@basePlanId', extraímos o produto pai para buscar no store
                let parentId = productId;
                if (productId.includes('@')) {
                    parentId = productId.split('@')[0];
                }

                const product = store.get(parentId);
                if (!product) {
                    console.error(`[Billing] Produto ${parentId} não foi encontrado no store.`);
                    resolve({
                        success: false,
                        error: "Assinatura indisponível no momento. Tente novamente mais tarde."
                    });
                    activePurchaseResolver = null;
                    return;
                }

                // Obtém a oferta específica baseada no productId completo (que pode conter a especificação @basePlanId)
                const offer = product.getOffer(productId);
                if (!offer) {
                    console.error(`[Billing] Nenhuma oferta encontrada para o produto/plano ${productId}.`);
                    resolve({
                        success: false,
                        error: "Nenhum plano de assinatura ativo encontrado na Play Store."
                    });
                    activePurchaseResolver = null;
                    return;
                }

                // Dispara o pedido nativo de compra passando a oferta
                store.order(offer).then((error: any) => {
                    if (error) {
                        console.error("[Billing] Erro ao disparar compra:", error);
                        resolve({
                            success: false,
                            error: error.message || "Erro ao processar o pagamento."
                        });
                        activePurchaseResolver = null;
                    }
                });
            } catch (err: any) {
                console.error(`[Billing] Falha ao disparar compra para ${productId}:`, err);
                resolve({
                    success: false,
                    error: err.message || "Erro inesperado ao iniciar a compra."
                });
                activePurchaseResolver = null;
            }
        });
    },

    /**
     * Consulta as compras anteriores e sincroniza o estado Premium do usuário
     */
    async restorePurchases(onStateChange: (isPremium: boolean) => void): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            console.log("[Billing] Restauração simulada na Web.");
            return;
        }

        try {
            console.log("[Billing] Atualizando informações de assinaturas...");
            await store.update();

            const ownedInStore = store.owned(this.PRODUCTS.SUB_ID);
            const isUserPremium = await resolvePremiumStatus(ownedInStore, this.getOwnedPurchaseToken());

            console.log(`[Billing] Restauração concluída. Usuário é Premium = ${isUserPremium}`);
            onStateChange(isUserPremium);
        } catch (err) {
            console.error("[Billing] Erro ao restaurar assinaturas:", err);
        }
    },

    /**
     * Confere a compra recém-feita com o servidor (que valida no Google Play).
     * Se o servidor não responder, a compra aprovada pela loja vale.
     */
    async verifyPurchase(purchaseToken: string | undefined): Promise<boolean> {
        if (import.meta.env.DEV && purchaseToken?.startsWith('SIMULATED_WEB_')) return true;
        return resolvePremiumStatus(true, purchaseToken);
    },

    /** purchaseToken da assinatura ativa no Google Play, se houver. */
    getOwnedPurchaseToken(): string | undefined {
        for (const receipt of store.localReceipts) {
            if (receipt.platform !== Platform.GOOGLE_PLAY) continue;
            const hasSubscription = receipt.transactions.some(tx =>
                tx.products.some(p => p.id === this.PRODUCTS.SUB_ID)
            );
            const token = (receipt as any).purchaseToken as string | undefined;
            if (hasSubscription && token) return token;
        }
        return undefined;
    }
};
