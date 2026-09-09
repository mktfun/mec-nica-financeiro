-- Migration: Tabela bot_downloaded_files com retenção de 48 horas
-- Created: 20260908000039

CREATE TABLE IF NOT EXISTS public.bot_downloaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  bank_code TEXT NOT NULL DEFAULT 'itau',
  bank_name TEXT NOT NULL DEFAULT 'Itaú Empresas',
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'processed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 days')
);

CREATE INDEX IF NOT EXISTS idx_bot_downloaded_files_store ON public.bot_downloaded_files(store_id);
CREATE INDEX IF NOT EXISTS idx_bot_downloaded_files_dates ON public.bot_downloaded_files(from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_bot_downloaded_files_created ON public.bot_downloaded_files(created_at);
CREATE INDEX IF NOT EXISTS idx_bot_downloaded_files_expires ON public.bot_downloaded_files(expires_at);

-- Habilita RLS
ALTER TABLE public.bot_downloaded_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read bot_downloaded_files" ON public.bot_downloaded_files;
CREATE POLICY "Authenticated users can read bot_downloaded_files"
  ON public.bot_downloaded_files
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert bot_downloaded_files" ON public.bot_downloaded_files;
CREATE POLICY "Authenticated users can insert bot_downloaded_files"
  ON public.bot_downloaded_files
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update bot_downloaded_files" ON public.bot_downloaded_files;
CREATE POLICY "Authenticated users can update bot_downloaded_files"
  ON public.bot_downloaded_files
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete bot_downloaded_files" ON public.bot_downloaded_files;
CREATE POLICY "Authenticated users can delete bot_downloaded_files"
  ON public.bot_downloaded_files
  FOR DELETE
  TO authenticated
  USING (true);

-- Função para expurgo de arquivos com mais de 2 dias ou já expirados
CREATE OR REPLACE FUNCTION public.purge_expired_bot_files()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  DELETE FROM public.bot_downloaded_files
  WHERE created_at < (now() - interval '2 days')
     OR expires_at < now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_bot_files() TO authenticated, service_role, anon;
