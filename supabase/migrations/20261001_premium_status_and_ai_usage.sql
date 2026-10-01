-- ============================================================
-- Migração: Status PRO validado no servidor + limite de uso da IA
-- Data: 2026-10-01
-- Descrição:
--   A) premium_status: quem é PRO e até quando. Só o servidor (Edge
--      Function verify-purchase, com service_role) escreve; o usuário
--      só lê o próprio status.
--   B) ai_usage: contador diário de chamadas à IA por recurso, usado
--      pela Edge Function gemini para aplicar os limites.
-- ============================================================

-- Mesma função da migração 20260518 (recriada para esta rodar sozinha)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- A. premium_status
-- ============================================================
CREATE TABLE IF NOT EXISTS public.premium_status (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium     boolean NOT NULL DEFAULT false,
  product_id     text,
  -- Um comprovante do Google Play só pode liberar o PRO de uma conta
  purchase_token text UNIQUE,
  expires_at     timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own premium status" ON public.premium_status;
CREATE POLICY "Users can view own premium status"
  ON public.premium_status
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Sem policies de INSERT/UPDATE/DELETE: o app não consegue se dar PRO.
REVOKE INSERT, UPDATE, DELETE ON public.premium_status FROM anon, authenticated;
GRANT SELECT ON public.premium_status TO authenticated;

DROP TRIGGER IF EXISTS set_updated_at ON public.premium_status;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.premium_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- B. ai_usage
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day     date NOT NULL,
  feature text NOT NULL,
  count   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, feature)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai usage" ON public.ai_usage;
CREATE POLICY "Users can view own ai usage"
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.ai_usage FROM anon, authenticated;
GRANT SELECT ON public.ai_usage TO authenticated;

-- Incrementa o uso de hoje se ainda estiver abaixo do limite.
-- Atômico (duas chamadas ao mesmo tempo não passam do limite).
-- Retorna true se a chamada foi permitida.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(p_user uuid, p_feature text, p_limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_limit <= 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_usage AS u (user_id, day, feature, count)
  VALUES (p_user, (now() AT TIME ZONE 'America/Sao_Paulo')::date, p_feature, 1)
  ON CONFLICT (user_id, day, feature)
  DO UPDATE SET count = u.count + 1
  WHERE u.count < p_limit
  RETURNING count INTO v_count;

  RETURN v_count IS NOT NULL;
END;
$$;

-- Só o servidor (service_role) pode consumir cota
REVOKE EXECUTE ON FUNCTION public.consume_ai_quota(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid, text, integer) TO service_role;
