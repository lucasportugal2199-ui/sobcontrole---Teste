import { Preferences } from '@capacitor/preferences';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const BIOMETRIC_PREF_KEY = 'biometric_enabled';

/**
 * Verifica se a biometria está disponível no dispositivo atual.
 * Só chama a API nativa se estivermos em uma plataforma nativa (iOS/Android).
 */
export async function isBiometricAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        console.log('[Biometric] Não está em plataforma nativa. Biometria indisponível na Web.');
        return false;
    }
    try {
        const result = await NativeBiometric.isAvailable();
        return !!result.isAvailable;
    } catch (err) {
        console.warn('[Biometric] Erro ao verificar disponibilidade de biometria:', err);
        return false;
    }
}

/**
 * Executa a verificação biométrica (impressão digital, reconhecimento facial ou PIN do dispositivo).
 * Retorna true se a autenticação for bem-sucedida.
 * Se não estiver em plataforma nativa, retorna true (fail-open) para permitir testes/desenvolvimento.
 */
export async function verifyBiometric(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        console.log('[Biometric] Não está em plataforma nativa. Ignorando validação (fail-open).');
        return true; 
    }
    try {
        await NativeBiometric.verifyIdentity({
            reason: 'Confirme sua identidade para acessar o SobControle',
            title: 'SobControle',
            subtitle: 'Use sua digital ou senha do dispositivo',
            description: 'Confirme sua biometria para desbloquear o aplicativo',
        });
        return true;
    } catch (err) {
        console.warn('[Biometric] Falha na autenticação biométrica:', err);
        return false;
    }
}

/**
 * Lê a preferência de biometria salva localmente.
 */
export async function getBiometricPreference(): Promise<boolean> {
    try {
        const { value } = await Preferences.get({ key: BIOMETRIC_PREF_KEY });
        return value === 'true';
    } catch {
        return false;
    }
}

/**
 * Salva a preferência de biometria localmente.
 */
export async function setBiometricPreference(enabled: boolean): Promise<void> {
    try {
        await Preferences.set({ key: BIOMETRIC_PREF_KEY, value: String(enabled) });
    } catch (err) {
        console.error('[Biometric] Erro ao salvar preferência:', err);
    }
}
