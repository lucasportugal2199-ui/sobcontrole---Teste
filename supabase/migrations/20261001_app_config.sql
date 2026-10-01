-- ============================================================
-- Migração: Tabela app_config (aviso de nova versão do app)
-- Data: 2026-10-01
-- Descrição:
--   O app (utils/updateChecker.ts) consulta app_config.key = 'version_config'
--   para avisar que existe versão nova na Play Store. A tabela não existia,
--   então o aviso nunca aparecia (erro 404 no console).
--
--   value.latest_version → acima da versão instalada: mostra o aviso
--   value.min_version    → acima da versão instalada: atualização OBRIGATÓRIA
--
--   Rode só DEPOIS que a versão de latest_version estiver publicada na
--   Play Store; senão o app pede para atualizar e a loja não tem a versão.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_config (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Qualquer um (inclusive antes do login) pode ler; só o painel/servidor altera
DROP POLICY IF EXISTS "Anyone can read app config" ON public.app_config;
CREATE POLICY "Anyone can read app config"
  ON public.app_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.app_config FROM anon, authenticated;
GRANT SELECT ON public.app_config TO anon, authenticated;

INSERT INTO public.app_config (key, value)
VALUES (
  'version_config',
  '{
    "latest_version": "1.9.2",
    "min_version": "1.0.0",
    "release_notes": "Correções importantes de segurança, sincronização mais confiável e o app funcionando mesmo sem internet."
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Para OBRIGAR todos a atualizar (ex.: fechar o PRO grátis das versões antigas),
-- depois que a 1.9.2 estiver na loja rode:
--   UPDATE public.app_config
--   SET value = jsonb_set(value, '{min_version}', '"1.9.2"')
--   WHERE key = 'version_config';
