import { registerPlugin, Capacitor } from '@capacitor/core';

export interface PendingBankTransaction {
    id: string;
    valor: number;
    descricao: string;
    tipo: 'entrada' | 'saida';
    paymentMethod: 'debito' | 'credito';
    bankName: string;
    packageName: string;
    timestamp: number;
}

interface BankNotificationPluginInterface {
    isPermissionGranted(): Promise<{ granted: boolean }>;
    requestPermission(): Promise<void>;
    isEnabled(): Promise<{ enabled: boolean }>;
    setEnabled(options: { enabled: boolean }): Promise<void>;
    getPendingTransactions(): Promise<{ transactions: PendingBankTransaction[] }>;
    clearPendingTransactions(): Promise<void>;
}

const NativeBankNotification = registerPlugin<BankNotificationPluginInterface>('BankNotification');

export const BankNotificationService = {
    isSupported(): boolean {
        return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    },

    async isPermissionGranted(): Promise<boolean> {
        if (!this.isSupported()) return false;
        try {
            const res = await NativeBankNotification.isPermissionGranted();
            return !!res.granted;
        } catch (e) {
            console.warn('[BankNotification] Erro ao verificar permissão:', e);
            return false;
        }
    },

    async requestPermission(): Promise<void> {
        if (!this.isSupported()) return;
        try {
            await NativeBankNotification.requestPermission();
        } catch (e) {
            console.error('[BankNotification] Erro ao solicitar permissão:', e);
        }
    },

    async isEnabled(): Promise<boolean> {
        if (!this.isSupported()) return false;
        try {
            const res = await NativeBankNotification.isEnabled();
            return res.enabled;
        } catch (e) {
            return true;
        }
    },

    async setEnabled(enabled: boolean): Promise<void> {
        if (!this.isSupported()) return;
        try {
            await NativeBankNotification.setEnabled({ enabled });
        } catch (e) {
            console.error('[BankNotification] Erro ao atualizar status:', e);
        }
    },

    async getPendingTransactions(): Promise<PendingBankTransaction[]> {
        if (!this.isSupported()) return [];
        try {
            const res = await NativeBankNotification.getPendingTransactions();
            return res.transactions || [];
        } catch (e) {
            console.warn('[BankNotification] Erro ao buscar transações pendentes:', e);
            return [];
        }
    },

    async clearPendingTransactions(): Promise<void> {
        if (!this.isSupported()) return;
        try {
            await NativeBankNotification.clearPendingTransactions();
        } catch (e) {
            console.warn('[BankNotification] Erro ao limpar transações pendentes:', e);
        }
    }
};
