# Design: Expurgo de OSs Zumbis/Antigas e Blindagem de Consulta do Pátio Ativo (355)

## 1. Migration SQL de Saneamento (`20260902000022_cleanup_patio_os_zombies.sql`)

```sql
-- 1. Expurga registros espúrios contendo 'Faturamento'
DELETE FROM public.patio_os
WHERE os_number ILIKE '%faturamento%'
   OR os_number ILIKE '%fat%';

-- 2. Expurga registros com anos anômalos ou anteriores a Julho/2026
DELETE FROM public.patio_os
WHERE opened_at < '2026-07-01'::timestamptz
   OR opened_at::text LIKE '2020%';

-- 3. Atualiza RPC com guardrails estritos
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
        COALESCE(s.id, p.store_id) AS store_id,
        COALESCE(s.name, p.store_name, p.store_id) AS store_name,
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
      AND p.opened_at >= (p_target_date - INTERVAL '60 days')
      AND p.os_number NOT ILIKE '%faturamento%'
      AND (
          (COALESCE(p.total_value, 0) - COALESCE(p.paid_value, 0)) > 0.05
          OR LOWER(COALESCE(p.status, 'em_aberto')) IN ('em_aberto', 'pago_parcial')
      )
    ORDER BY store_name ASC, p.opened_at ASC, p.os_number ASC;
$$;
```

---

## 2. Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Consulta Limpa sem OSs Zumbis
- **Ação:** Chamar `get_pending_patio_os_for_ocr('2026-09-01')`.
- **Resultado Esperado:** Retornar estritamente as OSs válidas das 10 filiais (sem registros com "Faturamento" ou datas de 2020 / janeiro/2026).

### Cenário 2: Total de Pátio Alinhado com a Planilha
- **Resultado Esperado:** O saldo total de pátio em aberto exibido no grid deve bater exatamente com os R$ 57.996,63 da planilha oficial.
