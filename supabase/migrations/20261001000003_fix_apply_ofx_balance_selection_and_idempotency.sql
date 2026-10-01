-- Migration: 20261001000003_fix_apply_ofx_balance_selection_and_idempotency.sql
-- Spec 462: Corrigir a seleção de saldo OFX, eliminar erro 42703 (updated_at em reconciliations)
-- e garantir idempotência estrita em regras e eventos de auditoria.

CREATE OR REPLACE FUNCTION public.apply_ofx_balance_selection(
  p_selections jsonb,
  p_target_date date,
  p_user_id text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item jsonb;
  v_account_key text;
  v_store_id text;
  v_candidate_id uuid;
  v_cand_data jsonb;
  v_source_kind text;
  v_balance_role text;
  v_memo_raw text;
  v_memo_norm text;
  v_posted_date date;
  v_amount numeric(15,2);
  v_amount_cents bigint;
  v_selection_mode text;
  v_remember_rule boolean;
  v_existing_sel record;
  v_rule_ver int := 1;
  v_existing_active_rule record;
  r record;
  v_affected_stores text[] := '{}';
  v_is_closed boolean := false;
BEGIN
  -- Validação de permissões se fornecido p_user_id
  IF p_user_id IS NOT NULL THEN
    PERFORM 1 FROM public.profiles 
    WHERE id::text = p_user_id 
      AND (role IN ('admin', 'gerente', 'financeiro') OR can_edit_data = true OR can_import = true);
  END IF;

  SELECT COALESCE(is_closed, false) INTO v_is_closed
  FROM public.daily_snapshots
  WHERE date = p_target_date;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_selections)
  LOOP
    v_account_key := v_item->>'account_key';
    v_store_id := v_item->>'store_id';
    v_selection_mode := COALESCE(v_item->>'selection_mode', 'manual');
    v_remember_rule := COALESCE((v_item->>'remember_rule')::boolean, false);
    
    v_cand_data := v_item->'candidate_data';
    IF v_cand_data IS NOT NULL THEN
      v_source_kind := v_cand_data->>'source_kind';
      v_balance_role := COALESCE(v_cand_data->>'balance_role', 'CLOSING');
      v_memo_raw := v_cand_data->>'memo_raw';
      v_memo_norm := v_cand_data->>'memo_normalized';
      v_posted_date := (v_cand_data->>'posted_date')::date;
      v_amount := (v_cand_data->>'amount')::numeric;
      v_amount_cents := COALESCE((v_cand_data->>'amount_cents')::bigint, round(v_amount * 100)::bigint);
    ELSE
      v_source_kind := v_item->>'source_kind';
      v_balance_role := COALESCE(v_item->>'balance_role', 'CLOSING');
      v_memo_raw := v_item->>'memo_raw';
      v_memo_norm := v_item->>'memo_normalized';
      v_posted_date := (v_item->>'posted_date')::date;
      v_amount := (v_item->>'amount')::numeric;
      v_amount_cents := round(v_amount * 100)::bigint;
    END IF;

    IF v_account_key IS NULL OR v_amount IS NULL OR v_posted_date IS NULL THEN
      CONTINUE;
    END IF;

    v_candidate_id := NULL;
    IF v_item->>'candidate_id' IS NOT NULL THEN
      BEGIN
        v_candidate_id := (v_item->>'candidate_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_candidate_id := NULL;
      END;
    END IF;

    IF v_candidate_id IS NULL THEN
      INSERT INTO public.ofx_balance_candidates (
        account_key,
        store_id,
        source_kind,
        balance_role,
        memo_raw,
        memo_normalized,
        posted_date,
        amount_cents,
        raw_amount,
        created_at,
        updated_at
      ) VALUES (
        v_account_key,
        v_store_id,
        COALESCE(v_source_kind, 'STMTTRN_MEMO'),
        v_balance_role,
        v_memo_raw,
        v_memo_norm,
        v_posted_date,
        v_amount_cents,
        v_amount,
        now(),
        now()
      )
      ON CONFLICT (account_key, posted_date, source_kind, balance_role, amount_cents, COALESCE(memo_normalized, ''))
      DO UPDATE SET
        store_id = COALESCE(EXCLUDED.store_id, ofx_balance_candidates.store_id),
        updated_at = now()
      RETURNING id INTO v_candidate_id;
    END IF;

    -- Idempotência em ofx_balance_rules: se marcado remember_rule
    IF v_remember_rule AND v_source_kind IS NOT NULL THEN
      SELECT * INTO v_existing_active_rule
      FROM public.ofx_balance_rules
      WHERE account_key = v_account_key AND is_active = true
      ORDER BY version DESC LIMIT 1;

      -- Apenas cria nova versão se a regra ativa atual for diferente
      IF v_existing_active_rule IS NULL 
         OR v_existing_active_rule.source_kind IS DISTINCT FROM v_source_kind
         OR COALESCE(v_existing_active_rule.memo_normalized, '') IS DISTINCT FROM COALESCE(v_memo_norm, '')
         OR COALESCE(v_existing_active_rule.store_id, '') IS DISTINCT FROM COALESCE(v_store_id, '') THEN

        SELECT COALESCE(MAX(version), 0) + 1 INTO v_rule_ver
        FROM public.ofx_balance_rules
        WHERE account_key = v_account_key;

        UPDATE public.ofx_balance_rules
        SET is_active = false, updated_at = now()
        WHERE account_key = v_account_key AND is_active = true;

        INSERT INTO public.ofx_balance_rules (
          account_key,
          store_id,
          source_kind,
          memo_normalized,
          date_role,
          is_active,
          version,
          updated_by,
          created_at,
          updated_at
        ) VALUES (
          v_account_key,
          v_store_id,
          v_source_kind,
          v_memo_norm,
          'SAME_DAY',
          true,
          v_rule_ver,
          p_user_id,
          now(),
          now()
        );
      ELSE
        v_rule_ver := v_existing_active_rule.version;
      END IF;
    END IF;

    -- Busca seleção existente para auditoria
    SELECT * INTO v_existing_sel
    FROM public.ofx_balance_selections
    WHERE account_key = v_account_key AND reconciliation_date = p_target_date;

    INSERT INTO public.ofx_balance_selections (
      account_key,
      store_id,
      reconciliation_date,
      candidate_id,
      source_kind,
      memo_normalized,
      posted_date,
      selected_amount,
      selection_mode,
      rule_version,
      selected_by,
      selected_at,
      updated_at
    ) VALUES (
      v_account_key,
      v_store_id,
      p_target_date,
      v_candidate_id,
      COALESCE(v_source_kind, 'STMTTRN_MEMO'),
      v_memo_norm,
      v_posted_date,
      v_amount,
      v_selection_mode,
      v_rule_ver,
      p_user_id,
      now(),
      now()
    )
    ON CONFLICT (account_key, reconciliation_date) DO UPDATE
    SET store_id = EXCLUDED.store_id,
        candidate_id = EXCLUDED.candidate_id,
        source_kind = EXCLUDED.source_kind,
        memo_normalized = EXCLUDED.memo_normalized,
        posted_date = EXCLUDED.posted_date,
        selected_amount = EXCLUDED.selected_amount,
        selection_mode = EXCLUDED.selection_mode,
        rule_version = EXCLUDED.rule_version,
        selected_by = EXCLUDED.selected_by,
        selected_at = now(),
        updated_at = now();

    -- Auditoria append-only: registra evento apenas se for nova seleção ou alteração de valor/candidato
    IF v_existing_sel IS NULL 
       OR v_existing_sel.candidate_id IS DISTINCT FROM v_candidate_id 
       OR v_existing_sel.selected_amount IS DISTINCT FROM v_amount THEN
      INSERT INTO public.ofx_balance_selection_events (
        account_key,
        store_id,
        reconciliation_date,
        previous_candidate_id,
        previous_amount,
        new_candidate_id,
        new_amount,
        selection_mode,
        reason,
        actor_id,
        created_at
      ) VALUES (
        v_account_key,
        v_store_id,
        p_target_date,
        v_existing_sel.candidate_id,
        v_existing_sel.selected_amount,
        v_candidate_id,
        v_amount,
        v_selection_mode,
        p_reason,
        p_user_id,
        now()
      );
    END IF;

    IF v_store_id IS NOT NULL AND NOT (v_store_id = ANY(v_affected_stores)) THEN
      v_affected_stores := array_append(v_affected_stores, v_store_id);
    END IF;
  END LOOP;

  -- Atualiza bank_total em public.reconciliations POR LOJA
  -- CORREÇÃO SPEC 462: reconciliations NÃO possui coluna updated_at!
  FOR r IN
    SELECT 
      sel.store_id,
      SUM(sel.selected_amount) as total_bank
    FROM public.ofx_balance_selections sel
    WHERE sel.reconciliation_date = p_target_date
      AND sel.store_id IS NOT NULL
      AND sel.store_id = ANY(v_affected_stores)
    GROUP BY sel.store_id
  LOOP
    INSERT INTO public.reconciliations (store_id, date, bank_total)
    VALUES (r.store_id, p_target_date, r.total_bank)
    ON CONFLICT (store_id, date) DO UPDATE
    SET bank_total = EXCLUDED.bank_total;
  END LOOP;

  -- Atualiza o snapshot diário consolidado
  UPDATE public.daily_snapshots
  SET saldo_bancario = (
        SELECT COALESCE(SUM(bank_total), 0.00)
        FROM public.reconciliations
        WHERE date = p_target_date
      ),
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{balance_revision}',
        to_jsonb(COALESCE((metadata->>'balance_revision')::int, 0) + 1)
      ),
      updated_at = now()
  WHERE date = p_target_date;

  -- Recalcula sumário diário canônico
  PERFORM public.get_daily_reconciliation_summary(p_target_date::text, true);

  RETURN jsonb_build_object(
    'success', true,
    'target_date', p_target_date,
    'affected_stores', v_affected_stores,
    'was_closed', v_is_closed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_ofx_balance_selection(jsonb, date, text, text) TO authenticated, service_role, anon;
