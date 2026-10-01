import { supabase } from './supabaseClient';
import { UserData } from '../types';
import { isEmptyState, isValidPayload, dataSummary, createSyncLogger } from './syncEngine';

const log = createSyncLogger('SupabaseSync');

/* ============================= */
/* SAVE — uma única gravação (upsert) */
/* ============================= */
// Nunca apagar a linha do usuário para "tentar de novo": se a inserção
// falhasse depois do DELETE, os dados sumiam da nuvem. Em caso de erro,
// a próxima sincronização automática tenta outra vez com os dados locais.
// Devolve o updated_at gravado no servidor, ou null se não salvou.
export async function saveAllDataToSupabase(
  userData: UserData
): Promise<string | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      log.warn('Sessão inválida — abortando save');
      return null;
    }

    // 🛑 BARREIRA: Payload inválido (null, undefined, {}, array, sem allData)
    if (!isValidPayload(userData)) {
      log.warn('🛑 BLOQUEADO: Payload inválido');
      return null;
    }

    const allDataPayload = {
      ...userData,
      __userId: user.id
    };

    log.info(`📤 SAVE INICIADO para user ${user.id.slice(0, 8)}`, dataSummary(userData));

    const { data, error } = await supabase
      .from('finance_all_data')
      .upsert(
        [{
          user_id: user.id,
          all_data: allDataPayload,
          updated_at: new Date().toISOString(),
        }],
        { onConflict: 'user_id' }
      )
      .select('updated_at')
      .maybeSingle();

    if (error) {
      log.error('❌ Erro no upsert:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: (error as any).hint
      });
      return null;
    }

    log.info('✅ Dados salvos no Supabase');
    return data?.updated_at ?? new Date().toISOString();
  } catch (err) {
    log.error('❌ Erro crítico ao salvar:', err);
    return null;
  }
}

/* ============================= */
/* VERSÃO REMOTA — só o updated_at (consulta leve) */
/* ============================= */
// Usado para saber se a nuvem mudou desde a última sincronização sem
// baixar todos os dados. Devolve null se o usuário ainda não tem dados lá.
export async function fetchRemoteUpdatedAt(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('Sessão inválida');

  const { data, error } = await supabase
    .from('finance_all_data')
    .select('updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.updated_at ?? null;
}

/* ============================= */
/* FETCH */
/* ============================= */
export async function fetchAllDataFromSupabase(): Promise<UserData | null> {
  return (await fetchAllDataWithVersion()).data;
}

/** Dados remotos + updated_at do servidor (versão usada pela sincronização automática). */
export async function fetchAllDataWithVersion(): Promise<{ data: UserData | null; updatedAt: string | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      log.warn('Sessão inválida — abortando fetch');
      return { data: null, updatedAt: null };
    }

    log.info(`Buscando dados do user ${user.id.slice(0, 8)}...`);

    const { data, error } = await supabase
      .from('finance_all_data')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      log.error('Erro na query:', error);
      throw error;
    }

    if (!data) {
      log.info('Nenhum dado encontrado no Supabase (usuário novo)');
      return { data: null, updatedAt: null };
    }

    // Log de diagnóstico
    log.info('📋 ROW DO BANCO:', {
      columns: Object.keys(data).join(', '),
      allDataKeysCount: Object.keys(data.all_data || {}).length,
      allDataSize: JSON.stringify(data.all_data || {}).length,
      updatedAt: data.updated_at,
    });

    if (data.all_data?.__userId && data.all_data.__userId !== user.id) {
      log.warn('⚠️ Dados remotos pertencem a outro usuário — ignorando');
      return { data: null, updatedAt: data.updated_at ?? null };
    }

    const remoteData = data.all_data ?? null;
    if (remoteData && !remoteData.lastUpdatedAt && data.updated_at) {
        remoteData.lastUpdatedAt = data.updated_at;
    }

    log.info('✅ Dados remotos carregados:', dataSummary(remoteData));

    return { data: remoteData, updatedAt: data.updated_at ?? null };
  } catch (err) {
    log.error('Erro ao buscar:', err);
    throw err;
  }
}
