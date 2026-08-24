-- Migration: 20260824000006_sync_patio_os_forensic_excel_2408.sql
-- Description: Sincronização forense do pátio de OSs para 24/08/2026 (OS #2326 Santo André e OS #1847 Rei do Módulo)

-- 1. Santo André (st-08): OS #2326 histórica que permanece em aberto no pátio (R$ 9.218,73)
DELETE FROM public.patio_os WHERE store_id = 'st-08' AND os_number = '2326';

INSERT INTO public.patio_os (
    store_id,
    store_name,
    os_number,
    plate,
    total_value,
    paid_value,
    status,
    raw_status,
    opened_at,
    last_payment_date,
    match_status
) VALUES (
    'st-08',
    'Santo André',
    '2326',
    '-',
    9218.73,
    0.00,
    'em_aberto',
    'Aberta',
    '2026-07-22',
    '2026-08-24',
    'pending'
);

-- 2. Rei do Módulo (st-09): OS #1847 quitada pela transação de cartão da Rede (R$ 12.900,00)
UPDATE public.patio_os
SET 
    paid_value = 12900.00,
    status = 'finalizada',
    raw_status = 'Finalizada',
    closed_at = '2026-08-21',
    updated_at = now()
WHERE store_id = 'st-09' AND os_number = '1847';

-- 3. Atualizar reconciliation do dia para alinhar na_loja_os de cada loja se necessário
UPDATE reconciliations r
SET na_loja_os = sub.patio_os_sum
FROM (
    SELECT store_id, COALESCE(SUM(
        COALESCE(total_value, 0) - COALESCE(paid_value, 0)
    ), 0) as patio_os_sum
    FROM patio_os
    WHERE opened_at::date <= '2026-08-24'::date
      AND LOWER(status) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
      AND (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
    GROUP BY store_id
) sub
WHERE r.store_id = sub.store_id AND r.date = '2026-08-24'::date;
