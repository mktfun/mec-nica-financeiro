-- Migration: 20260826000006_fix_stores_policy_and_ai_settings_schema.sql
-- Description: Leitura irrestrita de lojas para evitar bloqueios de PGRST303 e schema completo para ai_settings

-- 1. STORES: Permitir SELECT público/anônimo e autenticado
DROP POLICY IF EXISTS "stores_read" ON public.stores;
DROP POLICY IF EXISTS "stores_read_all" ON public.stores;
CREATE POLICY "stores_read_all" ON public.stores
    FOR SELECT
    USING (true);

-- 2. AI_SETTINGS: Adicionar colunas faltantes
ALTER TABLE public.ai_settings 
    ADD COLUMN IF NOT EXISTS user_id text,
    ADD COLUMN IF NOT EXISTS provider text DEFAULT 'google',
    ADD COLUMN IF NOT EXISTS model text DEFAULT 'gemini-3.5-flash-lite',
    ADD COLUMN IF NOT EXISTS api_key text;

-- 3. AI_SETTINGS: Garantir políticas RLS
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_settings_read_policy" ON public.ai_settings;
CREATE POLICY "ai_settings_read_policy" ON public.ai_settings
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "ai_settings_write_policy" ON public.ai_settings;
CREATE POLICY "ai_settings_write_policy" ON public.ai_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);
