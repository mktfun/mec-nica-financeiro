-- Migration: 20260817100000_create_mdr_contracts_and_audit_rpc.sql
-- Description: Tabela de contratos de taxas MDR e RPC de auditoria e cálculo de divergências por loja/bandeira.

-- 1. Tabela de Contratos de Taxas de Maquininhas
CREATE TABLE IF NOT EXISTS public.pos_fee_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    acquirer TEXT NOT NULL DEFAULT 'REDE',
    payment_method TEXT NOT NULL, -- 'debito', 'credito_vista', 'credito_2_6', 'credito_7_12', 'pix'
    brand TEXT NOT NULL,          -- 'mastercard', 'visa', 'elo', 'hipercard', 'todos'
    contracted_rate_pct NUMERIC(6,3) NOT NULL,
    max_tolerance_pct NUMERIC(6,3) DEFAULT 0.150,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.pos_fee_contracts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pos_fee_contracts' AND policyname = 'Allow read for all users'
  ) THEN
    CREATE POLICY "Allow read for all users" ON public.pos_fee_contracts FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pos_fee_contracts' AND policyname = 'Allow insert/update for all users'
  ) THEN
    CREATE POLICY "Allow insert/update for all users" ON public.pos_fee_contracts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Inserção de Contratos Padrão da Rede
INSERT INTO public.pos_fee_contracts (store_id, acquirer, payment_method, brand, contracted_rate_pct, max_tolerance_pct)
VALUES
  (NULL, 'REDE', 'debito', 'visa', 1.090, 0.100),
  (NULL, 'REDE', 'debito', 'mastercard', 1.090, 0.100),
  (NULL, 'REDE', 'debito', 'elo', 1.450, 0.150),
  (NULL, 'REDE', 'credito_vista', 'visa', 2.090, 0.150),
  (NULL, 'REDE', 'credito_vista', 'mastercard', 2.090, 0.150),
  (NULL, 'REDE', 'credito_vista', 'elo', 2.890, 0.200),
  (NULL, 'REDE', 'credito_2_6', 'visa', 2.890, 0.200),
  (NULL, 'REDE', 'credito_2_6', 'mastercard', 2.890, 0.200),
  (NULL, 'REDE', 'credito_2_6', 'elo', 3.490, 0.250),
  (NULL, 'REDE', 'credito_7_12', 'visa', 3.490, 0.250),
  (NULL, 'REDE', 'credito_7_12', 'mastercard', 3.490, 0.250),
  (NULL, 'REDE', 'credito_7_12', 'elo', 4.190, 0.300),
  (NULL, 'REDE', 'pix', 'todos', 0.690, 0.050)
ON CONFLICT DO NOTHING;

-- 3. RPC de Auditoria MDR
CREATE OR REPLACE FUNCTION public.get_mdr_audit_summary(
    p_store_id TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE := COALESCE(p_start_date, '2026-08-13'::DATE);
    v_end_date DATE := COALESCE(p_end_date, CURRENT_DATE);
    v_result JSONB;
BEGIN
    WITH pos_filtered AS (
        SELECT
            p.id,
            p.store_id,
            COALESCE(s.name, p.store_id, 'Loja Não Identificada') AS store_name,
            p.machine_name,
            p.payment_method,
            COALESCE(p.gross_amount, 0) AS gross_amount,
            COALESCE(p.net_amount, 0) AS net_amount,
            COALESCE(p.fee_amount, (COALESCE(p.gross_amount, 0) - COALESCE(p.net_amount, 0))) AS fee_amount,
            COALESCE(p.occurred_at, (p.target_date::TEXT || 'T00:00:00Z')::TIMESTAMPTZ) AS occurred_at,
            p.target_date,
            -- Extrai bandeira e modalidade
            CASE 
                WHEN LOWER(p.machine_name || ' ' || p.payment_method) LIKE '%visa%' THEN 'Visa'
                WHEN LOWER(p.machine_name || ' ' || p.payment_method) LIKE '%mast%' THEN 'Mastercard'
                WHEN LOWER(p.machine_name || ' ' || p.payment_method) LIKE '%elo%' THEN 'Elo'
                WHEN LOWER(p.machine_name || ' ' || p.payment_method) LIKE '%hiper%' THEN 'Hipercard'
                WHEN LOWER(p.machine_name || ' ' || p.payment_method) LIKE '%pix%' THEN 'PIX'
                ELSE 'Outras'
            END AS brand,
            CASE
                WHEN LOWER(p.payment_method) LIKE '%débito%' OR LOWER(p.payment_method) LIKE '%debito%' THEN 'debito'
                WHEN LOWER(p.payment_method) LIKE '%crédito%' OR LOWER(p.payment_method) LIKE '%credito%' THEN 'credito_vista'
                WHEN LOWER(p.payment_method) LIKE '%pix%' THEN 'pix'
                ELSE 'outros'
            END AS method_norm,
            -- Cálculo de taxa efetiva percentual
            CASE 
                WHEN COALESCE(p.gross_amount, 0) > 0 THEN
                    ROUND(((1.0 - (COALESCE(p.net_amount, 0) / p.gross_amount)) * 100.0)::NUMERIC, 3)
                ELSE 0
            END AS effective_rate_pct
        FROM public.pos_transactions p
        LEFT JOIN public.stores s ON s.id = p.store_id
        WHERE (p_store_id IS NULL OR p.store_id = p_store_id)
          AND p.target_date >= v_start_date
          AND p.target_date <= v_end_date
    ),
    audited_txs AS (
        SELECT 
            pf.*,
            COALESCE(c.contracted_rate_pct, 
                CASE 
                    WHEN pf.method_norm = 'debito' THEN 1.10
                    WHEN pf.method_norm = 'credito_vista' THEN 2.10
                    WHEN pf.method_norm = 'pix' THEN 0.70
                    ELSE 2.50
                END
            ) AS contracted_rate_pct,
            COALESCE(c.max_tolerance_pct, 0.15) AS tolerance_pct,
            -- Divergência
            (pf.effective_rate_pct - COALESCE(c.contracted_rate_pct, 
                CASE 
                    WHEN pf.method_norm = 'debito' THEN 1.10
                    WHEN pf.method_norm = 'credito_vista' THEN 2.10
                    WHEN pf.method_norm = 'pix' THEN 0.70
                    ELSE 2.50
                END
            )) AS divergence_pct,
            -- Cobrança a maior em R$
            GREATEST(0, ROUND(((pf.effective_rate_pct - COALESCE(c.contracted_rate_pct, 
                CASE 
                    WHEN pf.method_norm = 'debito' THEN 1.10
                    WHEN pf.method_norm = 'credito_vista' THEN 2.10
                    WHEN pf.method_norm = 'pix' THEN 0.70
                    ELSE 2.50
                END
            )) * pf.gross_amount / 100.0)::NUMERIC, 2)) AS overcharge_amount,
            -- Status da auditoria
            CASE
                WHEN (pf.effective_rate_pct - COALESCE(c.contracted_rate_pct, 2.0)) > 0.30 THEN 'divergente'
                WHEN (pf.effective_rate_pct - COALESCE(c.contracted_rate_pct, 2.0)) > 0.10 THEN 'atencao'
                ELSE 'conforme'
            END AS audit_status
        FROM pos_filtered pf
        LEFT JOIN public.pos_fee_contracts c ON c.is_active = TRUE
            AND (c.store_id IS NULL OR c.store_id = pf.store_id)
            AND (c.brand = LOWER(pf.brand) OR c.brand = 'todos')
            AND c.payment_method = pf.method_norm
    ),
    summary_totals AS (
        SELECT
            COALESCE(SUM(gross_amount), 0) AS total_gross,
            COALESCE(SUM(net_amount), 0) AS total_net,
            COALESCE(SUM(fee_amount), 0) AS total_fees,
            COALESCE(SUM(overcharge_amount), 0) AS total_overcharge,
            CASE 
                WHEN COALESCE(SUM(gross_amount), 0) > 0 THEN
                    ROUND(((COALESCE(SUM(fee_amount), 0) / SUM(gross_amount)) * 100.0)::NUMERIC, 2)
                ELSE 0
            END AS avg_effective_rate_pct,
            COUNT(*) FILTER (WHERE audit_status = 'divergente') AS divergent_count,
            COUNT(*) AS total_count
        FROM audited_txs
    ),
    by_brand AS (
        SELECT 
            brand,
            COALESCE(SUM(gross_amount), 0) AS gross,
            COALESCE(SUM(net_amount), 0) AS net,
            COALESCE(SUM(fee_amount), 0) AS fees,
            COALESCE(SUM(overcharge_amount), 0) AS overcharge,
            CASE 
                WHEN COALESCE(SUM(gross_amount), 0) > 0 THEN
                    ROUND(((COALESCE(SUM(fee_amount), 0) / SUM(gross_amount)) * 100.0)::NUMERIC, 2)
                ELSE 0
            END AS effective_rate_pct,
            ROUND(AVG(contracted_rate_pct)::NUMERIC, 2) AS contracted_rate_pct
        FROM audited_txs
        GROUP BY brand
        ORDER BY gross DESC
    ),
    by_store AS (
        SELECT
            store_id,
            store_name,
            COALESCE(SUM(gross_amount), 0) AS gross,
            COALESCE(SUM(net_amount), 0) AS net,
            COALESCE(SUM(fee_amount), 0) AS fees,
            COALESCE(SUM(overcharge_amount), 0) AS overcharge,
            CASE 
                WHEN COALESCE(SUM(gross_amount), 0) > 0 THEN
                    ROUND(((COALESCE(SUM(fee_amount), 0) / SUM(gross_amount)) * 100.0)::NUMERIC, 2)
                ELSE 0
            END AS effective_rate_pct,
            COUNT(*) FILTER (WHERE audit_status = 'divergente') AS divergent_count
        FROM audited_txs
        GROUP BY store_id, store_name
        ORDER BY overcharge DESC, gross DESC
    )
    SELECT jsonb_build_object(
        'totals', (SELECT row_to_json(summary_totals) FROM summary_totals),
        'by_brand', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_brand b), '[]'::jsonb),
        'by_store', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM by_store s), '[]'::jsonb),
        'transactions', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
            SELECT 
                id,
                store_id,
                store_name,
                machine_name,
                payment_method,
                brand,
                gross_amount,
                net_amount,
                fee_amount,
                effective_rate_pct,
                contracted_rate_pct,
                divergence_pct,
                overcharge_amount,
                audit_status,
                occurred_at,
                target_date
            FROM audited_txs
            ORDER BY overcharge_amount DESC, occurred_at DESC
            LIMIT 200
        ) t), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;
