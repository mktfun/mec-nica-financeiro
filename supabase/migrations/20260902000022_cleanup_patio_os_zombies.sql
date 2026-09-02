-- ============================================================================
-- Migration: 20260902000022_cleanup_patio_os_zombies.sql
-- Description: Expurgo de registros espúrios/zumbis de patio_os (ex: sufixo 'Faturamento',
--              datas anômalas < 2026-07-01 e anos anteriores) e blindagem defensiva
--              da RPC get_pending_patio_os_for_ocr com janela operacional estrita.
-- ============================================================================

-- 1. Expurga registros espúrios contendo 'Faturamento' ou 'Fat' no número da OS
DELETE FROM public.patio_os
WHERE os_number ILIKE '%faturamento%'
   OR os_number ILIKE '%fat%';

-- 2. Expurga registros com anos anômalos (ex: 2020) ou anteriores a Julho/2026
DELETE FROM public.patio_os
WHERE opened_at < '2026-07-01'::timestamptz
   OR opened_at::text LIKE '2020%';

-- 3. Atualiza RPC get_pending_patio_os_for_ocr com guardrails estritos
DROP FUNCTION IF EXISTS public.get_pending_patio_os_for_ocr(date);

CREATE OR REPLACE FUNCTION public.get_pending_patio_os_for_ocr(
    p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    store_id TEXT,
    store_name TEXT,
    os_id UUID,
    os_number TEXT,
    plate TEXT,
    client_name TEXT,
    total_value NUMERIC,
    paid_value NUMERIC,
    pending_value NUMERIC,
    days_open INT,
    opened_at TIMESTAMPTZ,
    status TEXT,
    raw_status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COALESCE(
            s.id,
            CASE 
                WHEN LOWER(p.store_name) LIKE '%dompedro%' OR LOWER(p.store_id) LIKE '%dompedro%' THEN 'st-01'
                WHEN LOWER(p.store_name) LIKE '%jabaquara%' OR LOWER(p.store_id) LIKE '%jabaquara%' THEN 'st-02'
                WHEN LOWER(p.store_name) LIKE '%beretta%' OR LOWER(p.store_id) LIKE '%beretta%' THEN 'st-03'
                WHEN LOWER(p.store_name) LIKE '%kennedy%' OR LOWER(p.store_id) LIKE '%kennedy%' THEN 'st-04'
                WHEN LOWER(p.store_name) LIKE '%piraporinha%' OR LOWER(p.store_id) LIKE '%piraporinha%' THEN 'st-05'
                WHEN LOWER(p.store_name) LIKE '%planalto%' OR LOWER(p.store_id) LIKE '%planalto%' THEN 'st-06'
                WHEN LOWER(p.store_name) LIKE '%rudge%' OR LOWER(p.store_id) LIKE '%rudge%' THEN 'st-07'
                WHEN LOWER(p.store_name) LIKE '%santoandre%' OR LOWER(p.store_id) LIKE '%santoandre%' THEN 'st-08'
                WHEN LOWER(p.store_name) LIKE '%modulo%' OR LOWER(p.store_id) LIKE '%modulo%' THEN 'st-09'
                WHEN LOWER(p.store_name) LIKE '%maua%' OR LOWER(p.store_id) LIKE '%maua%' THEN '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f'
                ELSE p.store_id
            END
        ) AS store_id,
        COALESCE(
            s.name,
            CASE 
                WHEN LOWER(p.store_name) LIKE '%dompedro%' OR LOWER(p.store_id) LIKE '%dompedro%' THEN 'Dom Pedro - DP'
                WHEN LOWER(p.store_name) LIKE '%jabaquara%' OR LOWER(p.store_id) LIKE '%jabaquara%' THEN 'Jabaquara - JAB'
                WHEN LOWER(p.store_name) LIKE '%beretta%' OR LOWER(p.store_id) LIKE '%beretta%' THEN 'Jorge Beretta - DHJV'
                WHEN LOWER(p.store_name) LIKE '%kennedy%' OR LOWER(p.store_id) LIKE '%kennedy%' THEN 'Kennedy - MP'
                WHEN LOWER(p.store_name) LIKE '%piraporinha%' OR LOWER(p.store_id) LIKE '%piraporinha%' THEN 'Piraporinha - EMPORIO'
                WHEN LOWER(p.store_name) LIKE '%planalto%' OR LOWER(p.store_id) LIKE '%planalto%' THEN 'Planalto - BRASICAR'
                WHEN LOWER(p.store_name) LIKE '%rudge%' OR LOWER(p.store_id) LIKE '%rudge%' THEN 'Rudge Ramos - CAP'
                WHEN LOWER(p.store_name) LIKE '%santoandre%' OR LOWER(p.store_id) LIKE '%santoandre%' THEN 'Santo André - HD'
                WHEN LOWER(p.store_name) LIKE '%modulo%' OR LOWER(p.store_id) LIKE '%modulo%' THEN 'Rei do Módulo - MP'
                WHEN LOWER(p.store_name) LIKE '%maua%' OR LOWER(p.store_id) LIKE '%maua%' THEN 'Maua - MHE'
                ELSE COALESCE(p.store_name, p.store_id)
            END
        ) AS store_name,
        p.id AS os_id,
        p.os_number,
        COALESCE(p.plate, 'N/I') AS plate,
        COALESCE(p.client_name, 'Cliente') AS client_name,
        COALESCE(p.total_value, 0)::numeric AS total_value,
        COALESCE(p.paid_value, 0)::numeric AS paid_value,
        GREATEST(0, COALESCE(p.total_value, 0) - COALESCE(p.paid_value, 0))::numeric AS pending_value,
        GREATEST(0, (p_target_date - p.opened_at::date))::int AS days_open,
        p.opened_at,
        p.status,
        COALESCE(p.raw_status, p.status) AS raw_status
    FROM public.patio_os p
    LEFT JOIN public.stores s ON (s.id = p.store_id)
    WHERE p.opened_at::date <= p_target_date
      AND p.opened_at >= (p_target_date - INTERVAL '90 days')
      AND p.os_number NOT ILIKE '%faturamento%'
      AND p.os_number NOT ILIKE '%fat%'
      AND (
          (COALESCE(p.total_value, 0) - COALESCE(p.paid_value, 0)) > 0.05
          OR LOWER(COALESCE(p.status, 'em_aberto')) IN ('em_aberto', 'pago_parcial')
      )
    ORDER BY store_name ASC, p.opened_at ASC, p.os_number ASC;
$$;
