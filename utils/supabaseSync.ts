import { supabase } from './supabaseClient';
import { UserData } from '../types';
import { isEmptyState, isValidPayload, dataSummary, createSyncLogger } from './syncEngine';

const log = createSyncLogger('SupabaseSync');

/* ============================= */
/* SAVE — com verificação pós-save e fallback */
/* ============================= */
export async function saveAllDataToSupabase(
  userData: UserData
): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      log.warn('Sessão inválida — abortando save');
      return;
    }

    // 🛑 BARREIRA: Payload inválido (null, undefined, {}, array, sem allData)
    if (!isValidPayload(userData)) {
      log.warn('🛑 BLOQUEADO: Payload inválido', {
        userId: user.id.slice(0, 8),
        type: typeof userData,
        keys: userData ? Object.keys(userData) : 'N/A'
      });
      return;
    }

    // Prepara o payload para o JSONB
    const allDataPayload = {
      ...userData,
      __userId: user.id
    };

    const payloadStr = JSON.stringify(allDataPayload);
    const payloadKeys = Object.keys(allDataPayload);
    
    log.info(`📤 SAVE INICIADO para user ${user.id.slice(0, 8)}`, {
      summary: dataSummary(userData),
      payloadSizeKB: (payloadStr.length / 1024).toFixed(1),
      payloadKeysCount: payloadKeys.length,
    });

    // ===== TENTATIVA 1: UPSERT com .select() para ver o retorno =====
    const { data: upsertResult, error: upsertError } = await supabase
      .from('finance_all_data')
      .upsert(
        [{
          user_id: user.id,
          all_data: allDataPayload,
          updated_at: new Date().toISOString(),
        }],
        { onConflict: 'user_id' }
      )
      .select('all_data');

    if (upsertError) {
      log.error('❌ Erro no upsert:', { 
        code: upsertError.code, 
        message: upsertError.message, 
        details: upsertError.details,
        hint: (upsertError as any).hint 
      });
    } else {
      const returnedKeys = Object.keys(upsertResult?.[0]?.all_data || {});
      log.info('✅ Upsert retorno:', {
        returnedRows: upsertResult?.length || 0,
        returnedAllDataKeys: returnedKeys.length,
        firstKeys: returnedKeys.slice(0, 5).join(', '),
      });
    }

    // ===== VERIFICAÇÃO: Lê de volta para confirmar =====
    const { data: verifyData, error: verifyError } = await supabase
      .from('finance_all_data')
      .select('all_data, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (verifyError) {
      log.error('❌ Erro na verificação pós-save:', verifyError);
      return;
    }
    
    if (!verifyData) {
      log.warn('⚠️ Nenhum registro encontrado na verificação');
      return;
    }

    const savedKeys = Object.keys(verifyData.all_data || {});
    const savedSize = JSON.stringify(verifyData.all_data || {}).length;
    
    log.info(`🔍 VERIFICAÇÃO PÓS-SAVE:`, {
      savedKeysCount: savedKeys.length,
      savedSizeBytes: savedSize,
      isStillEmpty: savedKeys.length <= 1,
    });

    // Se os dados FORAM salvos, sucesso!
    if (savedKeys.length > 1) {
      log.info('✅ Dados verificados com sucesso no Supabase!');
      return;
    }

    // ===== DADOS NÃO FORAM PERSISTIDOS — Tentar UPDATE explícito =====
    log.warn('⚠️ all_data ainda vazio após upsert! Tentando UPDATE explícito...');
    
    const { data: updateResult, error: updateError } = await supabase
      .from('finance_all_data')
      .update({ all_data: allDataPayload })
      .eq('user_id', user.id)
      .select('all_data');

    if (updateError) {
      log.error('❌ UPDATE falhou:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: (updateError as any).hint
      });
    } else {
      const updateKeys = Object.keys(updateResult?.[0]?.all_data || {});
      log.info('🔍 UPDATE retorno:', {
        returnedRows: updateResult?.length || 0,
        returnedAllDataKeys: updateKeys.length,
      });
      
      if (updateKeys.length > 1) {
        log.info('✅ UPDATE explícito salvou os dados com sucesso!');
        return;
      }
    }

    // ===== UPDATE TAMBÉM FALHOU — Tentar DELETE + INSERT =====
    log.warn('⚠️ UPDATE também não persistiu. Tentando DELETE + INSERT...');
    
    const { error: deleteError } = await supabase
      .from('finance_all_data')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      log.error('❌ DELETE falhou:', deleteError);
      return;
    }

    log.info('✅ DELETE OK — inserindo nova row...');

    const { data: insertResult, error: insertError } = await supabase
      .from('finance_all_data')
      .insert({
        user_id: user.id,
        all_data: allDataPayload,
      })
      .select('all_data');

    if (insertError) {
      log.error('❌ INSERT falhou:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: (insertError as any).hint
      });
    } else {
      const insertKeys = Object.keys(insertResult?.[0]?.all_data || {});
      log.info('🔍 INSERT retorno:', {
        returnedRows: insertResult?.length || 0,
        returnedAllDataKeys: insertKeys.length,
      });
      
      if (insertKeys.length > 1) {
        log.info('✅ DELETE + INSERT salvou os dados com sucesso!');
      } else {
        log.error('❌ TODAS AS TENTATIVAS FALHARAM. Possível problema de RLS/permissão no Supabase.');
        log.error('💡 SOLUÇÃO: Verifique no Supabase Dashboard → Authentication → Policies:');
        log.error('   1. A tabela finance_all_data tem RLS habilitado?');
        log.error('   2. Existe policy de UPDATE para authenticated?');
        log.error('   3. A policy de UPDATE inclui all_data?');
      }
    }

  } catch (err) {
    log.error('❌ Erro crítico ao salvar:', err);
    try {
      log.error('Detalhes:', JSON.stringify(err, null, 2));
    } catch { /* ignore */ }
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
