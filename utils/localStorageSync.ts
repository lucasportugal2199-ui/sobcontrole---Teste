import { Preferences } from '@capacitor/preferences';
import { isEmptyState, isValidPayload, createSyncLogger } from './syncEngine';

const log = createSyncLogger('LocalStorage');
const getKey = (userId: string) => `sobcontrole_${userId}`;

export async function saveLocalData(data: any, userId: string) {
  // 🛑 BARREIRA: Impede salvar payload inválido no cache local
  if (!isValidPayload(data)) {
    log.warn('🛑 BLOQUEADO: Tentativa de salvar payload inválido localmente', {
      userId: userId.slice(0, 8),
      type: typeof data,
      keys: data ? Object.keys(data).length : 0
    });
    return;
  }

  // ℹ️ Log se estado é "vazio" (sem transações), mas NÃO bloqueia
  if (isEmptyState(data)) {
    log.info('ℹ️ Estado sem transações detectado — salvando localmente mesmo assim', {
      userId: userId.slice(0, 8)
    });
  }

  const payload = {
    ...data,
    __userId: userId
  };

  const jsonString = JSON.stringify(payload);
  log.info(`Salvando localmente para user ${userId.slice(0, 8)}...`, {
    sizeKB: (jsonString.length / 1024).toFixed(1)
  });

  await Preferences.set({
    key: getKey(userId),
    value: jsonString,
  });

  log.info('✅ Dados salvos localmente');
}

export async function loadLocalData(userId: string) {
  log.info(`Carregando dados locais para user ${userId.slice(0, 8)}...`);
  const { value } = await Preferences.get({ key: getKey(userId) });

  if (!value) {
    log.info('Nenhum dado local encontrado');
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    log.info('✅ Dados locais carregados', {
      keys: Object.keys(parsed).length,
      sizeKB: (value.length / 1024).toFixed(1)
    });
    return parsed;
  } catch (err) {
    log.error('Erro ao parsear dados locais:', err);
    return null;
  }
}

export async function clearLocalData(userId: string) {
  log.info(`Limpando dados locais para user ${userId.slice(0, 8)}...`);
  await Preferences.remove({ key: getKey(userId) });
  log.info('✅ Dados locais removidos');
}

/**
 * Limpa TODOS os dados de todos os usuários do Preferences.
 * Usado no logout para garantir isolamento total entre contas.
 */
export async function clearAllUserData() {
  log.info('🧹 Limpando todos os dados de usuários do Preferences...');
  const { keys } = await Preferences.keys();
  const userKeys = keys.filter(k => k.startsWith('sobcontrole_'));

  for (const key of userKeys) {
    await Preferences.remove({ key });
    log.info(`  Removido: ${key}`);
  }

  log.info(`✅ ${userKeys.length} entradas de usuários removidas`);
}