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
export async function saveAllDataToSupabase(
  userData: UserData
): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      log.warn('Sessão inválida — abortando save');
      return false;
    }

    // 🛑 BARREIRA: Payload inválido (null, undefined, {}, array, sem allData)
    if (!isValidPayload(userData)) {
      log.warn('🛑 BLOQUEADO: Payload inválido');
      return false;
    }

    const allDataPayload = {
      ...userData,
      __userId: user.id
    };

    log.info(`📤 SAVE INICIADO para user ${user.id.slice(0, 8)}`, dataSummary(userData));

    const { error } = await supabase
      .from('finance_all_data')
      .upsert(
        [{
          user_id: user.id,
          all_data: allDataPayload,
          updated_at: new Date().toISOString(),
        }],
        { onConflict: 'user_id' }
      );

    if (error) {
      log.error('❌ Erro no upsert:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: (error as any).hint
      });
      return false;
    }

    log.info('✅ Dados salvos no Supabase');
    return true;
  } catch (err) {
    log.error('❌ Erro crítico ao salvar:', err);
    return false;
  }
}

/* ============================= */
/* FETCH */
/* ============================= */
export async function fetchAllDataFromSupabase(): Promise<UserData | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      log.warn('Sessão inválida — abortando fetch');
      return null;
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
      return null;
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
      return null;
    }

    const remoteData = data.all_data ?? null;
    if (remoteData && !remoteData.lastUpdatedAt && data.updated_at) {
        remoteData.lastUpdatedAt = data.updated_at;
    }

    log.info('✅ Dados remotos carregados:', dataSummary(remoteData));

    return remoteData;
  } catch (err) {
    log.error('Erro ao buscar:', err);
    throw err;
  }
}
