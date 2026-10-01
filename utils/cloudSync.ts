/**
 * cloudSync.ts — Uma rodada da sincronização automática com a nuvem.
 *
 * Fica separado do App para poder ser testado: as chamadas ao Supabase
 * entram como parâmetro (CloudApi).
 *
 * Fluxo:
 * 1. Consulta leve: só a versão (updated_at) da nuvem.
 * 2. Se a versão é a mesma da última sincronização, a nuvem tem exatamente o
 *    que enviamos da última vez: não baixa nada.
 *    Se mudou (outro aparelho), baixa tudo.
 * 3. Junta local + nuvem (smartMerge, respeitando exclusões).
 * 4. Envia só se o resultado for diferente do que a nuvem já tem.
 */

import { UserData } from '../types';
import { smartMerge, sameSyncedContent, isValidPayload, createSyncLogger } from './syncEngine';

export interface CloudApi {
  /** updated_at da nuvem, ou null se o usuário ainda não tem dados lá */
  fetchVersion(): Promise<string | null>;
  fetchFull(): Promise<{ data: UserData | null; updatedAt: string | null }>;
  /** Salva e devolve o novo updated_at, ou null se falhou */
  save(data: UserData): Promise<string | null>;
}

/** O que sabemos da nuvem desde a última rodada (guardado entre rodadas). */
export interface CloudSyncState {
  /** undefined = ainda não sincronizou nesta sessão */
  remoteVersion: string | null | undefined;
  lastSynced: UserData | null;
}

export const initialCloudSyncState = (): CloudSyncState => ({ remoteVersion: undefined, lastSynced: null });

export interface CloudSyncResult {
  /** Estado local depois de juntar com a nuvem (aplicar na tela se for diferente do atual) */
  merged: UserData;
  downloaded: boolean;
  uploaded: boolean;
}

const log = createSyncLogger('CloudSync');

/**
 * Executa uma rodada. Atualiza `state` conforme avança.
 * Devolve null se foi interrompida (erro de rede, falha ao salvar ou `isCancelled`).
 */
export async function runCloudSync(
  current: UserData,
  state: CloudSyncState,
  api: CloudApi,
  isCancelled: () => boolean = () => false
): Promise<CloudSyncResult | null> {
  let remoteVersion: string | null;
  let remote: UserData | null = null;
  let downloaded = false;

  try {
    remoteVersion = await api.fetchVersion();
    if (isCancelled()) return null;

    const cloudUnchanged = state.remoteVersion !== undefined &&
      remoteVersion === state.remoteVersion && state.lastSynced !== null;

    if (cloudUnchanged) {
      remote = state.lastSynced;
    } else if (remoteVersion !== null) {
      log.info('☁️ Nuvem mudou desde a última sincronização — baixando dados');
      const full = await api.fetchFull();
      remote = full.data;
      remoteVersion = full.updatedAt;
      downloaded = true;
    }
  } catch (err) {
    log.warn('Erro ao buscar a nuvem — rodada abortada', err);
    return null;
  }
  if (isCancelled()) return null;

  // Nada que só exista na nuvem se perde: só some o que foi excluído
  const merged = remote && isValidPayload(remote) ? smartMerge(current, remote) : current;

  if (remote && sameSyncedContent(merged, remote)) {
    log.info('☁️ Nuvem já está atualizada — nenhum upload necessário');
    state.remoteVersion = remoteVersion;
    state.lastSynced = remote;
    return { merged, downloaded, uploaded: false };
  }

  const toSave = { ...merged, lastUpdatedAt: new Date().toISOString() };
  const savedAt = await api.save(toSave);
  if (!savedAt) return null;
  state.remoteVersion = savedAt;
  state.lastSynced = toSave;
  if (isCancelled()) return null;

  return { merged, downloaded, uploaded: true };
}
