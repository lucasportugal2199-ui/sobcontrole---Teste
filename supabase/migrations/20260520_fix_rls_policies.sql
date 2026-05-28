-- ============================================================
-- Migração: Corrigir RLS Policies da tabela finance_all_data
-- Data: 2026-05-20
-- Descrição: 
--   Garante que RLS está habilitado com policies corretas para
--   SELECT, INSERT, UPDATE e DELETE na tabela finance_all_data.
--   Cada usuário autenticado só pode acessar seus próprios dados.
-- ============================================================

-- 1. Habilita RLS (idempotente — se já estiver habilitado, não muda nada)
ALTER TABLE finance_all_data ENABLE ROW LEVEL SECURITY;

-- 2. Remove TODAS as policies existentes (para recriar do zero)
DROP POLICY IF EXISTS "Users can view own data" ON finance_all_data;
DROP POLICY IF EXISTS "Users can insert own data" ON finance_all_data;
DROP POLICY IF EXISTS "Users can update own data" ON finance_all_data;
DROP POLICY IF EXISTS "Users can delete own data" ON finance_all_data;
-- Remove policies com nomes antigos que podem existir
DROP POLICY IF EXISTS "select_own" ON finance_all_data;
DROP POLICY IF EXISTS "insert_own" ON finance_all_data;
DROP POLICY IF EXISTS "update_own" ON finance_all_data;
DROP POLICY IF EXISTS "delete_own" ON finance_all_data;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON finance_all_data;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON finance_all_data;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON finance_all_data;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON finance_all_data;

-- 3. Cria as 4 policies necessárias

-- SELECT: Usuário autenticado pode LER apenas seus próprios dados
CREATE POLICY "Users can view own data" 
  ON finance_all_data 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- INSERT: Usuário autenticado pode INSERIR apenas para si mesmo
CREATE POLICY "Users can insert own data" 
  ON finance_all_data 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuário autenticado pode ATUALIZAR (incluindo all_data!) apenas seus próprios dados
-- IMPORTANTE: Usa BOTH "USING" e "WITH CHECK" para garantir acesso completo
CREATE POLICY "Users can update own data" 
  ON finance_all_data 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Usuário autenticado pode DELETAR apenas seus próprios dados
CREATE POLICY "Users can delete own data" 
  ON finance_all_data 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- 4. Garante que o role 'authenticated' tem permissões de coluna
GRANT SELECT, INSERT, UPDATE, DELETE ON finance_all_data TO authenticated;
