import { App as CapApp } from '@capacitor/app';
import { supabase } from './supabaseClient';

export interface AppUpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  minVersion: string;
  releaseNotes?: string;
  isForceUpdate: boolean;
  storeUrl: string;
}

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.sobcontrole.app';

/**
 * Compara duas versões semânticas (ex: "1.7.0" vs "1.8.0")
 * Retorna > 0 se v1 > v2, < 0 se v1 < v2, ou 0 se forem iguais.
 */
export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = (v1 || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = (v2 || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

/**
 * Obtém a versão atual do app e compara com a versão remota no Supabase/Config
 */
export const checkForAppUpdate = async (): Promise<AppUpdateInfo> => {
  try {
    let currentVersion = '1.7.0'; // Fallback
    try {
      const info = await CapApp.getInfo();
      if (info && info.version) {
        currentVersion = info.version;
      }
    } catch {
      // Ambiente Web
    }

    // Busca metadados de versão da tabela 'app_config' ou 'app_versions' no Supabase
    let latestVersion = '1.7.0';
    let minVersion = '1.0.0';
    let releaseNotes = 'Melhorias de desempenho, widgets e correções de bugs.';
    let isForce = false;

    if (supabase) {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('key', 'version_config')
        .single();

      if (data && data.value) {
        latestVersion = data.value.latest_version || latestVersion;
        minVersion = data.value.min_version || minVersion;
        releaseNotes = data.value.release_notes || releaseNotes;
      }
    }

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
    const isForceUpdate = compareVersions(minVersion, currentVersion) > 0;

    return {
      hasUpdate,
      latestVersion,
      minVersion,
      releaseNotes,
      isForceUpdate,
      storeUrl: PLAY_STORE_URL
    };
  } catch (error) {
    console.warn('Erro ao verificar atualização do app:', error);
    return {
      hasUpdate: false,
      latestVersion: '1.7.0',
      minVersion: '1.0.0',
      isForceUpdate: false,
      storeUrl: PLAY_STORE_URL
    };
  }
};
