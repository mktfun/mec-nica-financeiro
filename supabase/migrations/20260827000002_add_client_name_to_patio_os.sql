-- Migration: 20260827000002_add_client_name_to_patio_os.sql
-- Description: Adiciona coluna client_name em patio_os e estoque_os_pendente para rastreabilidade e match por cliente

ALTER TABLE public.patio_os ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.estoque_os_pendente ADD COLUMN IF NOT EXISTS client_name text;
