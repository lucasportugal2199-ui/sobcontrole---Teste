-- ============================================================
-- Migração: Melhorias de robustez na tabela finance_all_data
-- Data: 2026-05-18
-- Descrição: 
--   A) ON DELETE CASCADE no user_id (auto-limpa dados ao deletar usuário)
--   B) Trigger updated_at server-side (garante timestamp confiável)
-- ============================================================

-- ============================================================
-- A. ON DELETE CASCADE
-- Remove a constraint existente e recria com CASCADE.
-- Quando um usuário for deletado via auth.users, todos os seus
-- registros em finance_all_data serão removidos automaticamente.
-- ============================================================

ALTER TABLE finance_all_data
  DROP CONSTRAINT IF EXISTS finance_all_data_user_id_fkey;

ALTER TABLE finance_all_data
  ADD CONSTRAINT finance_all_data_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ============================================================
-- B. Trigger updated_at server-side
-- Cria uma função que define updated_at = NOW() antes de cada
-- UPDATE, garantindo que o timestamp nunca dependa do app.
-- ============================================================

-- Função reutilizável para qualquer tabela que precise de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger antigo caso exista (idempotência)
DROP TRIGGER IF EXISTS set_updated_at ON finance_all_data;

-- Cria o trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON finance_all_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
