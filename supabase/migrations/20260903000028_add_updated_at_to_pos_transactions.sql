-- ============================================================================
-- Migration: 20260903000028_add_updated_at_to_pos_transactions.sql
-- Description: Adiciona updated_at em pos_transactions, cria trigger de atualização automática
--              e recompila match_stage2_rede_os de forma idempotente.
-- ============================================================================

-- 1. Adição idempotente da coluna updated_at em pos_transactions
ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Backfill para registros existentes com updated_at nulo
UPDATE public.pos_transactions
SET updated_at = COALESCE(updated_at, occurred_at, created_at, now())
WHERE updated_at IS NULL;

-- 3. Função e Trigger para manter updated_at sempre sincronizado em atualizações
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pos_transactions_updated_at ON public.pos_transactions;
CREATE TRIGGER trg_pos_transactions_updated_at
BEFORE UPDATE ON public.pos_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Recompilação Idempotente da RPC match_stage2_rede_os
DROP FUNCTION IF EXISTS public.match_stage2_rede_os(date, text);

CREATE OR REPLACE FUNCTION public.match_stage2_rede_os(
    p_target_date DATE,
    p_store_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pos RECORD;
    v_os RECORD;
    v_candidates_count INT;
    v_matched_count INT := 0;
    v_collision_count INT := 0;
    v_collisions JSONB := '[]'::jsonb;
    v_candidate_samples JSONB;
    
    v_total_rede_bruto NUMERIC := 0;
    v_total_rede_liquido NUMERIC := 0;
    v_total_rede_taxas NUMERIC := 0;
    v_unmatched_pos_count INT := 0;
    v_unmatched_pos_sample JSONB := '[]'::jsonb;
    v_unmatched_os_cards_count INT := 0;
    v_unmatched_os_cards_sample JSONB := '[]'::jsonb;
BEGIN
    IF p_target_date IS NULL THEN
        RAISE EXCEPTION 'p_target_date é obrigatório.';
    END IF;

    -- Iterar sobre POS transactions não pareadas da data
    FOR v_pos IN 
        SELECT id, store_id, net_amount, gross_amount, fee_amount, payment_method, machine_name, occurred_at
        FROM public.pos_transactions
        WHERE target_date = p_target_date
          AND matched_os_number IS NULL
          AND (p_store_id IS NULL OR store_id = p_store_id)
        ORDER BY net_amount DESC
    LOOP
        v_os := NULL;
        v_candidates_count := 0;

        -- Teste de correspondência determinística na mesma filial
        SELECT count(*), jsonb_agg(jsonb_build_object(
            'id', id, 
            'os_number', os_number, 
            'client_name', client_name, 
            'total_value', total_value, 
            'pending_value', (total_value - paid_value)
        ))
        INTO v_candidates_count, v_candidate_samples
        FROM public.patio_os
        WHERE store_id = v_pos.store_id
          AND (
              ABS(COALESCE(credit_value, 0) - v_pos.net_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos.net_amount) <= 0.05
              OR ABS(COALESCE(credit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS((total_value - paid_value) - v_pos.net_amount) <= 0.05
              OR ABS(total_value - v_pos.gross_amount) <= 0.05
              OR ABS(total_value - v_pos.net_amount) <= 0.05
          );

        -- GUARDA DE UNICIDADE: Apenas 1 candidato -> Match 100% Determinístico
        IF v_candidates_count = 1 THEN
            SELECT id, os_number, total_value, paid_value, status
            INTO v_os
            FROM public.patio_os
            WHERE store_id = v_pos.store_id
              AND (
                  ABS(COALESCE(credit_value, 0) - v_pos.net_amount) <= 0.05
                  OR ABS(COALESCE(debit_value, 0) - v_pos.net_amount) <= 0.05
                  OR ABS(COALESCE(credit_value, 0) - v_pos.gross_amount) <= 0.05
                  OR ABS(COALESCE(debit_value, 0) - v_pos.gross_amount) <= 0.05
                  OR ABS((total_value - paid_value) - v_pos.net_amount) <= 0.05
                  OR ABS(total_value - v_pos.gross_amount) <= 0.05
                  OR ABS(total_value - v_pos.net_amount) <= 0.05
              )
            LIMIT 1;

            UPDATE public.pos_transactions
            SET matched_os_number = v_os.os_number,
                settlement_status = 'entrou',
                updated_at = now()
            WHERE id = v_pos.id;

            IF v_os.status NOT ILIKE '%finalizad%' AND v_os.status NOT ILIKE '%pago%' THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_pos.net_amount),
                    status = CASE WHEN (paid_value + v_pos.net_amount) >= total_value - 0.05 THEN 'finalizada' ELSE 'pago_parcial' END,
                    match_status = 'MATCHED',
                    updated_at = now()
                WHERE id = v_os.id;
            END IF;

            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, rede_transaction_id, status, target_date
                ) VALUES (v_pos.store_id, v_os.os_number, v_pos.id, 'matched', p_target_date);
            EXCEPTION WHEN OTHERS THEN NULL; END;

            v_matched_count := v_matched_count + 1;

        -- GUARDA DE COLISÃO: Mais de 1 candidato -> Suspensão para desempate do operador
        ELSIF v_candidates_count > 1 THEN
            v_collision_count := v_collision_count + 1;
            v_collisions := v_collisions || jsonb_build_object(
                'pos_id', v_pos.id,
                'store_id', v_pos.store_id,
                'net_amount', v_pos.net_amount,
                'gross_amount', v_pos.gross_amount,
                'payment_method', v_pos.payment_method,
                'candidates', v_candidate_samples
            );
        END IF;
    END LOOP;

    -- Totalizadores da Adquirente no dia
    SELECT 
        COALESCE(SUM(gross_amount), 0),
        COALESCE(SUM(net_amount), 0),
        COALESCE(SUM(fee_amount), 0)
    INTO v_total_rede_bruto, v_total_rede_liquido, v_total_rede_taxas
    FROM public.pos_transactions
    WHERE target_date = p_target_date
      AND (p_store_id IS NULL OR store_id = p_store_id);

    -- Resíduos A: Cartões sem OS
    SELECT count(*), COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'store_id', store_id, 'net_amount', net_amount, 'machine_name', machine_name, 'payment_method', payment_method
    )), '[]'::jsonb)
    INTO v_unmatched_pos_count, v_unmatched_pos_sample
    FROM (
        SELECT id, store_id, net_amount, machine_name, payment_method
        FROM public.pos_transactions
        WHERE target_date = p_target_date
          AND matched_os_number IS NULL
          AND (p_store_id IS NULL OR store_id = p_store_id)
        LIMIT 20
    ) t;

    -- Resíduos B: OSs com Cartão não passado
    SELECT count(*), COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'store_id', store_id, 'os_number', os_number, 'client_name', client_name, 'credit_value', credit_value, 'debit_value', debit_value
    )), '[]'::jsonb)
    INTO v_unmatched_os_cards_count, v_unmatched_os_cards_sample
    FROM (
        SELECT id, store_id, os_number, client_name, credit_value, debit_value
        FROM public.patio_os
        WHERE opened_at::date = p_target_date
          AND (COALESCE(credit_value, 0) > 0 OR COALESCE(debit_value, 0) > 0)
          AND match_status <> 'MATCHED'
          AND (p_store_id IS NULL OR store_id = p_store_id)
        LIMIT 20
    ) o;

    RETURN jsonb_build_object(
        'success', true,
        'target_date', p_target_date,
        'matched_count', v_matched_count,
        'collisions_count', v_collision_count,
        'collisions', v_collisions,
        'unmatched_pos_count', v_unmatched_pos_count,
        'unmatched_pos_sample', v_unmatched_pos_sample,
        'unmatched_os_cards_count', v_unmatched_os_cards_count,
        'unmatched_os_cards_sample', v_unmatched_os_cards_sample,
        'totals', jsonb_build_object(
            'rede_bruto', v_total_rede_bruto,
            'rede_liquido', v_total_rede_liquido,
            'rede_taxas', v_total_rede_taxas
        )
    );
END;
$$;

-- 5. Grants de execução
GRANT EXECUTE ON FUNCTION public.match_stage2_rede_os(date, text) TO authenticated, service_role, anon;
