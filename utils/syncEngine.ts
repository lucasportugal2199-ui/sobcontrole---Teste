/**
 * syncEngine.ts — Motor de sincronização seguro para SobControle
 * 
 * Responsabilidades:
 * 1. SyncLogger: logs detalhados com prefixos e contexto
 * 2. isEmptyState: detecta estado vazio/default para impedir overwrite
 * 3. smartMerge: merge inteligente entre dados locais e remotos
 */

import { UserData, AllData, Categorias, PatrimonioHistory, Transaction } from '../types';
import { INITIAL_CATEGORIAS } from '../constants';
import { recalculateBalancesFrom } from './helpers';

// ============================================================
// SYNC LOGGER — Logs detalhados para debug de sincronização
// ============================================================

export interface SyncLogger {
  info: (msg: string, data?: any) => void;
  warn: (msg: string, data?: any) => void;
  error: (msg: string, data?: any) => void;
  group: (label: string) => void;
  groupEnd: () => void;
}

export function createSyncLogger(prefix: string): SyncLogger {
  const timestamp = () => new Date().toISOString().split('T')[1].slice(0, 12);
  
  return {
    info: (msg: string, data?: any) => {
      // Só no `npm run dev`: no app publicado não registramos dados do usuário
      if (!import.meta.env.DEV) return;
      console.log(`[${timestamp()}] 🔄 [${prefix}] ${msg}`, data !== undefined ? data : '');
    },
    warn: (msg: string, data?: any) => {
      console.warn(`[${timestamp()}] ⚠️ [${prefix}] ${msg}`, data !== undefined ? data : '');
    },
    error: (msg: string, data?: any) => {
      console.error(`[${timestamp()}] ❌ [${prefix}] ${msg}`, data !== undefined ? data : '');
    },
    group: (label: string) => {
      console.group(`🔄 [${prefix}] ${label}`);
    },
    groupEnd: () => {
      console.groupEnd();
    }
  };
}

// ============================================================
// EMPTY STATE GUARD — Detecta estado vazio/default
// ============================================================

/**
 * Verifica se um UserData representa um estado vazio/default.
 * Usado para impedir que o app sobrescreva dados reais na nuvem
 * com um estado vazio (após desinstalar, limpar cache, etc.)
 */
export function isEmptyState(data: UserData | null | undefined): boolean {
  if (!data) return true;

  // Checa se allData tem algum mês com transações
  const hasTransactions = Object.keys(data.allData || {}).some(monthKey => {
    const month = data.allData[monthKey];
    return month?.transactions && month.transactions.length > 0;
  });

  // Checa se há dados customizados pelo usuário
  const hasGoals = (data.savingsGoals || []).length > 0;
  const hasCards = (data.creditCards || []).length > 0;
  const hasAssets = (data.assets || []).length > 0;
  const hasAccounts = (data.accounts || []).length > 0;
  const hasSubscriptions = (data.subscriptions || []).length > 0;
  const hasBudgets = Object.keys(data.budgets || {}).length > 0;
  const hasImportHistory = (data.importHistory || []).length > 0;
  
  // Checa se categorias foram customizadas (diferente do default)
  const hasCustomCategories = checkCategoriesCustomized(data.categories);

  // Se NENHUM desses indicadores é true, o estado é considerado vazio
  const isEmpty = !hasTransactions && !hasGoals && !hasCards && !hasAssets && 
                  !hasAccounts && !hasSubscriptions && !hasBudgets && 
                  !hasImportHistory && !hasCustomCategories;

  return isEmpty;
}

/**
 * Validação de payload antes de qualquer persistência (local ou remota).
 * Garante que o objeto tem estrutura mínima válida de UserData.
 * Diferente de isEmptyState (que checa se há dados do USUÁRIO),
 * este checa se o payload é um objeto válido e não-nulo.
 */
export function isValidPayload(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;
  if (Array.isArray(payload)) return false;
  if (Object.keys(payload).length === 0) return false;
  // Deve ter pelo menos allData como chave (mesmo que seja um objeto vazio {})
  if (!('allData' in payload)) return false;
  return true;
}

/**
 * Verifica se as categorias foram customizadas pelo usuário
 * (diferentes das categorias padrão INITIAL_CATEGORIAS)
 */
function checkCategoriesCustomized(categories: Categorias | undefined): boolean {
  if (!categories) return false;
  
  const defaultEntradaNames = new Set(INITIAL_CATEGORIAS.entrada.map(c => c.name));
  const defaultSaidaNames = new Set(INITIAL_CATEGORIAS.saida.map(c => c.name));
  
  // Se tem categorias a mais que as padrão, foi customizado
  const entradaCustom = (categories.entrada || []).some(c => !defaultEntradaNames.has(c.name));
  const saidaCustom = (categories.saida || []).some(c => !defaultSaidaNames.has(c.name));
  
  return entradaCustom || saidaCustom;
}

/**
 * Retorna um resumo legível do conteúdo de um UserData (para logs)
 */
export function dataSummary(data: UserData | null | undefined): string {
  if (!data) return '(null)';
  
  const txCount = Object.values(data.allData || {}).reduce((sum, month) => {
    return sum + (month?.transactions?.length || 0);
  }, 0);
  const monthCount = Object.keys(data.allData || {}).length;
  
  return [
    `${txCount} transações em ${monthCount} meses`,
    `${(data.savingsGoals || []).length} metas`,
    `${(data.creditCards || []).length} cartões`,
    `${(data.accounts || []).length} contas`,
    `${(data.assets || []).length} ativos`,
    `${(data.subscriptions || []).length} assinaturas`,
    `lastUpdatedAt: ${data.lastUpdatedAt || '(sem timestamp)'}`,
  ].join(' | ');
}


// ============================================================
// SMART MERGE — Merge inteligente entre dados local e remoto
// ============================================================

/**
 * Faz merge inteligente entre dados locais e remotos.
 * - Transações: union por ID (sem duplicatas)
 * - Categorias: union (preserva custom de ambos os lados)
 * - Goals/Cards/Assets/Accounts/Subscriptions: union por ID
 * - Budgets/Colors: merge por chave (mais recente vence)
 * - Profile: campo-a-campo, o mais completo vence
 * - lastUpdatedAt: o mais recente entre os dois
 */
export function smartMerge(local: UserData, remote: UserData): UserData {
  const log = createSyncLogger('SmartMerge');
  
  log.group('Iniciando merge');
  log.info('Local:', dataSummary(local));
  log.info('Remoto:', dataSummary(remote));
  
  // Determinar qual é o mais recente (para tiebreaker)
  const localTime = new Date(local.lastUpdatedAt || 0).getTime();
  const remoteTime = new Date(remote.lastUpdatedAt || 0).getTime();
  const newerSource = localTime >= remoteTime ? 'local' : 'remote';
  
  log.info(`Fonte mais recente: ${newerSource} (local: ${local.lastUpdatedAt}, remote: ${remote.lastUpdatedAt})`);

  // 1. Merge allData (transações por mês)
  let mergedAllData = mergeAllData(local.allData || {}, remote.allData || {});
  const sortedKeys = Object.keys(mergedAllData).sort();
  if (sortedKeys.length > 0) {
    mergedAllData = recalculateBalancesFrom(sortedKeys[0], mergedAllData);
  }
  
  // 2. Merge categorias
  const mergedCategories = mergeCategories(local.categories, remote.categories);
  
  // 3. Merge por ID: goals, cards, assets, accounts, subscriptions
  const mergedGoals = mergeById(local.savingsGoals || [], remote.savingsGoals || []);
  const mergedCards = mergeById(local.creditCards || [], remote.creditCards || []);
  const mergedAssets = mergeById(local.assets || [], remote.assets || []);
  const mergedAccounts = mergeById(local.accounts || [], remote.accounts || []);
  const mergedSubscriptions = mergeById(local.subscriptions || [], remote.subscriptions || []);
  
  // 4. Merge por chave: budgets, categoryColors
  const mergedBudgets = { ...(remote.budgets || {}), ...(local.budgets || {}) };
  const mergedColors = { ...(remote.categoryColors || {}), ...(local.categoryColors || {}) };
  
  // 5. Merge patrimônio history
  const mergedPatrimonio = mergePatrimonioHistory(
    local.patrimonioHistory || [], 
    remote.patrimonioHistory || []
  );
  
  // 6. Merge import history
  const mergedImportHistory = mergeById(local.importHistory || [], remote.importHistory || []);
  
  // 7. Profile: mais completo vence
  const mergedProfile: UserData['userProfile'] = {
    name: local.userProfile?.name || remote.userProfile?.name || 'Usuário',
    email: local.userProfile?.email || remote.userProfile?.email || '',
    ...(remote.userProfile || {}),
    ...(local.userProfile || {}),
    // Preserva badges de ambos os lados (union)
    badges: [...new Set([
      ...(local.userProfile?.badges || []),
      ...(remote.userProfile?.badges || [])
    ])],
    // Para streaks, o maior vence
    currentStreak: Math.max(
      local.userProfile?.currentStreak || 0,
      remote.userProfile?.currentStreak || 0
    ),
    // Para scans, o maior vence
    aiScansCount: Math.max(
      local.userProfile?.aiScansCount || 0,
      remote.userProfile?.aiScansCount || 0
    ),
  };

  // 8. Dashboard layout: mais recente vence
  const mergedLayout = newerSource === 'local' 
    ? (local.dashboardLayout || remote.dashboardLayout) 
    : (remote.dashboardLayout || local.dashboardLayout);
  
  // 9. Theme: mais recente vence
  const mergedTheme = newerSource === 'local' ? local.theme : remote.theme;

  const result: UserData = {
    allData: mergedAllData,
    categories: mergedCategories,
    categoryColors: mergedColors,
    creditCards: mergedCards,
    budgets: mergedBudgets,
    savingsGoals: mergedGoals,
    dashboardLayout: mergedLayout,
    userProfile: mergedProfile,
    importHistory: mergedImportHistory,
    theme: mergedTheme || 'dark',
    assets: mergedAssets,
    patrimonioHistory: mergedPatrimonio,
    accounts: mergedAccounts,
    subscriptions: mergedSubscriptions,
    lastUpdatedAt: new Date().toISOString(),
  };

  log.info('Resultado merge:', dataSummary(result));
  log.groupEnd();
  
  return result;
}


// --- Helpers internos do merge ---

/**
 * Merge allData (transações por mês). Faz union de transações por ID
 * dentro de cada mês, e inclui meses que só existem em um lado.
 */
function mergeAllData(local: AllData, remote: AllData): AllData {
  const allMonths = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const merged: AllData = {};
  
  for (const monthKey of allMonths) {
    const localMonth = local[monthKey];
    const remoteMonth = remote[monthKey];
    
    if (!localMonth && remoteMonth) {
      merged[monthKey] = remoteMonth;
    } else if (localMonth && !remoteMonth) {
      merged[monthKey] = localMonth;
    } else if (localMonth && remoteMonth) {
      // Ambos existem — merge transações por ID
      const txMap = new Map<string, Transaction>();
      
      // Adiciona remotos primeiro (serão sobrescritos pelo local se ID coincidir)
      for (const tx of (remoteMonth.transactions || [])) {
        txMap.set(tx.id, tx);
      }
      // Locais sobrescrevem (mais recente)
      for (const tx of (localMonth.transactions || [])) {
        txMap.set(tx.id, tx);
      }
      
      merged[monthKey] = {
        transactions: Array.from(txMap.values()),
        saldoFinal: 0, // será recalculado
      };
    }
  }
  
  return merged;
}

/**
 * Merge categorias: union de categorias custom de ambos os lados
 */
function mergeCategories(local: Categorias | undefined, remote: Categorias | undefined): Categorias {
  if (!local && !remote) return INITIAL_CATEGORIAS;
  if (!local) return remote!;
  if (!remote) return local;
  
  const mergeList = (a: any[], b: any[]): any[] => {
    const map = new Map<string, any>();
    for (const item of b) {
      map.set(item.name || item.id, item);
    }
    for (const item of a) {
      map.set(item.name || item.id, item);
    }
    return Array.from(map.values());
  };
  
  return {
    entrada: mergeList(local.entrada || [], remote.entrada || []),
    saida: mergeList(local.saida || [], remote.saida || []),
  };
}

/**
 * Merge genérico de arrays de objetos com campo `id`
 */
function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of remote) {
    map.set(item.id, item);
  }
  for (const item of local) {
    map.set(item.id, item);  // Local sobrescreve remoto se mesmo ID
  }
  return Array.from(map.values());
}

/**
 * Merge patrimônio history por monthKey (union)
 */
function mergePatrimonioHistory(local: PatrimonioHistory[], remote: PatrimonioHistory[]): PatrimonioHistory[] {
  const map = new Map<string, PatrimonioHistory>();
  for (const item of remote) {
    map.set(item.monthKey, item);
  }
  for (const item of local) {
    map.set(item.monthKey, item); // Local vence em caso de conflito
  }
  return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}
