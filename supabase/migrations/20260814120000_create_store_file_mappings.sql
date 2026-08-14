-- Migration: Create store_file_mappings table to persist file alias to store matches across browsers
CREATE TABLE IF NOT EXISTS public.store_file_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_alias TEXT NOT NULL UNIQUE,
  store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
  store_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by alias
CREATE INDEX IF NOT EXISTS idx_store_file_mappings_file_alias ON public.store_file_mappings (file_alias);

-- Enable RLS
ALTER TABLE public.store_file_mappings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated and anon users
DROP POLICY IF EXISTS "Allow all access to store_file_mappings" ON public.store_file_mappings;
CREATE POLICY "Allow all access to store_file_mappings" ON public.store_file_mappings
  FOR ALL USING (true) WITH CHECK (true);
