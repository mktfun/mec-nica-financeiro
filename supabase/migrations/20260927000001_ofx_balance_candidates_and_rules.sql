-- =========================================================================
-- MIGRATION: 20260927000001_ofx_balance_candidates_and_rules.sql
-- SPEC: 439 — Seleção e mapeamento editável do saldo de cada OFX por conta e data
-- =========================================================================

-- 1. TABELA DE CANDIDATOS DE SALDO EXTRAÍDOS DOS EXTRATOS (OFX/PDF)
CREATE TABLE IF NOT EXISTS public.ofx_balance_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_key TEXT NOT NULL,
  store_id TEXT REFERENCES public.stores(id) ON DELETE SET NULL,
  file_fingerprint TEXT,
  source_kind TEXT NOT NULL, -- 'STMTTRN_MEMO', 'LEDGERBAL', 'AVAILBAL', 'PRVBAL'
  balance_role TEXT NOT NULL, -- 'OPENING', 'CLOSING', 'LEDGER', 'AVAILABLE'
  memo_raw TEXT,
  memo_normalized TEXT,
  posted_date DATE NOT NULL,
  amount_cents BIGINT NOT NULL,
  raw_amount NUMERIC(15,2) NOT NULL,
  fitid TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ofx_bal_cand_unique 
  ON public.ofx_balance_candidates (account_key, posted_date, source_kind, balance_role, amount_cents, COALESCE(memo_normalized, ''));

CREATE INDEX IF NOT EXISTS idx_ofx_bal_cand_acct_date 
  ON public.ofx_balance_candidates (account_key, posted_date);

CREATE INDEX IF NOT EXISTS idx_ofx_bal_cand_store_date 
  ON public.ofx_balance_candidates (store_id, posted_date);

-- 2. TABELA DE REGRAS DE SALDO POR CONTA / FILIAL (MAPEAMENTO DURADOURO)
CREATE TABLE IF NOT EXISTS public.ofx_balance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_key TEXT NOT NULL,
  store_id TEXT REFERENCES public.stores(id) ON DELETE SET NULL,
  source_kind TEXT NOT NULL,
  memo_normalized TEXT,
  date_role TEXT NOT NULL DEFAULT 'SAME_DAY',
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INT NOT NULL DEFAULT 1,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ofx_bal_rules_active_acct 
  ON public.ofx_balance_rules (account_key) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_ofx_bal_rules_acct 
  ON public.ofx_balance_rules (account_key);

-- 3. TABELA DE SELEÇÕES EFETIVAS DE SALDO POR DATA DE CONCILIAÇÃO
CREATE TABLE IF NOT EXISTS public.ofx_balance_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_key TEXT NOT NULL,
  store_id TEXT REFERENCES public.stores(id) ON DELETE SET NULL,
  reconciliation_date DATE NOT NULL,
  candidate_id UUID REFERENCES public.ofx_balance_candidates(id) ON DELETE SET NULL,
  source_kind TEXT NOT NULL,
  memo_normalized TEXT,
  posted_date DATE NOT NULL,
  selected_amount NUMERIC(15,2) NOT NULL,
  selection_mode TEXT NOT NULL DEFAULT 'rule', -- 'rule' ou 'manual'
  rule_version INT,
  selected_by TEXT,
  selected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_ofx_balance_selections UNIQUE (account_key, reconciliation_date)
);

CREATE INDEX IF NOT EXISTS idx_ofx_bal_sel_store_date 
  ON public.ofx_balance_selections (store_id, reconciliation_date);

-- 4. TABELA APPEND-ONLY DE AUDITORIA E HISTÓRICO DE ALTERAÇÃO DE SALDO
CREATE TABLE IF NOT EXISTS public.ofx_balance_selection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_key TEXT NOT NULL,
  store_id TEXT,
  reconciliation_date DATE NOT NULL,
  previous_candidate_id UUID,
  previous_amount NUMERIC(15,2),
  new_candidate_id UUID,
  new_amount NUMERIC(15,2),
  selection_mode TEXT,
  reason TEXT,
  store_bank_total_before NUMERIC(15,2),
  store_bank_total_after NUMERIC(15,2),
  actor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ofx_bal_events_acct 
  ON public.ofx_balance_selection_events (account_key, reconciliation_date);

-- 5. POLÍTICAS DE RLS
ALTER TABLE public.ofx_balance_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofx_balance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofx_balance_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofx_balance_selection_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to ofx_balance_candidates" ON public.ofx_balance_candidates;
CREATE POLICY "Allow read access to ofx_balance_candidates"
  ON public.ofx_balance_candidates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all access to ofx_balance_candidates for authenticated" ON public.ofx_balance_candidates;
CREATE POLICY "Allow all access to ofx_balance_candidates for authenticated"
  ON public.ofx_balance_candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read access to ofx_balance_rules" ON public.ofx_balance_rules;
CREATE POLICY "Allow read access to ofx_balance_rules"
  ON public.ofx_balance_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all access to ofx_balance_rules for authenticated" ON public.ofx_balance_rules;
CREATE POLICY "Allow all access to ofx_balance_rules for authenticated"
  ON public.ofx_balance_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read access to ofx_balance_selections" ON public.ofx_balance_selections;
CREATE POLICY "Allow read access to ofx_balance_selections"
  ON public.ofx_balance_selections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all access to ofx_balance_selections for authenticated" ON public.ofx_balance_selections;
CREATE POLICY "Allow all access to ofx_balance_selections for authenticated"
  ON public.ofx_balance_selections FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read access to ofx_balance_selection_events" ON public.ofx_balance_selection_events;
CREATE POLICY "Allow read access to ofx_balance_selection_events"
  ON public.ofx_balance_selection_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert access to ofx_balance_selection_events for authenticated" ON public.ofx_balance_selection_events;
CREATE POLICY "Allow insert access to ofx_balance_selection_events for authenticated"
  ON public.ofx_balance_selection_events FOR INSERT TO authenticated WITH CHECK (true);

-- 6. RPC: preview_ofx_balance_selection
CREATE OR REPLACE FUNCTION public.preview_ofx_balance_selection(
  p_selections jsonb,
  p_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item jsonb;
  v_store_id text;
  v_account_key text;
  v_amount numeric(15,2);
  v_results jsonb := '[]'::jsonb;
  r record;
BEGIN
  CREATE TEMP TABLE tmp_preview_sel (
    account_key text,
    store_id text,
    amount numeric(15,2)
  ) ON COMMIT DROP;

  INSERT INTO tmp_preview_sel (account_key, store_id, amount)
  SELECT account_key, store_id, selected_amount
  FROM public.ofx_balance_selections
  WHERE reconciliation_date = p_date AND store_id IS NOT NULL;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_selections)
  LOOP
    v_account_key := v_item->>'account_key';
    v_store_id := v_item->>'store_id';
    v_amount := (v_item->>'amount')::numeric;

    DELETE FROM tmp_preview_sel WHERE account_key = v_account_key;
    IF v_store_id IS NOT NULL AND v_amount IS NOT NULL THEN
      INSERT INTO tmp_preview_sel (account_key, store_id, amount)
      VALUES (v_account_key, v_store_id, v_amount);
    END IF;
  END LOOP;

  FOR r IN 
    SELECT 
      s.id as store_id,
      s.name as store_name,
      COALESCE(rec.bank_total, 0.00) as current_bank_total,
      COALESCE(SUM(tmp.amount), 0.00) as new_bank_total
    FROM public.stores s
    LEFT JOIN public.reconciliations rec ON rec.store_id = s.id AND rec.date = p_date
    LEFT JOIN tmp_preview_sel tmp ON tmp.store_id = s.id
    WHERE s.id IN (SELECT DISTINCT store_id FROM tmp_preview_sel)
       OR rec.bank_total IS NOT NULL
    GROUP BY s.id, s.name, rec.bank_total
  LOOP
    v_results := v_results || jsonb_build_object(
      'store_id', r.store_id,
      'store_name', r.store_name,
      'current_bank_total', r.current_bank_total,
      'new_bank_total', r.new_bank_total,
      'diff', round(r.new_bank_total - r.current_bank_total, 2)
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'impacts', v_results);
END;
$$;

-- 7. RPC: apply_ofx_balance_selection
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
  r record;
  v_affected_stores text[] := '{}';
  v_is_closed boolean := false;
BEGIN
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

    IF v_remember_rule AND v_source_kind IS NOT NULL THEN
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
    END IF;

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

    IF v_store_id IS NOT NULL AND NOT (v_store_id = ANY(v_affected_stores)) THEN
      v_affected_stores := array_append(v_affected_stores, v_store_id);
    END IF;
  END LOOP;

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
    INSERT INTO public.reconciliations (store_id, date, bank_total, updated_at)
    VALUES (r.store_id, p_target_date, r.total_bank, now())
    ON CONFLICT (store_id, date) DO UPDATE
    SET bank_total = EXCLUDED.bank_total,
        updated_at = now();
  END LOOP;

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

  PERFORM public.get_daily_reconciliation_summary(p_target_date::text, true);

  RETURN jsonb_build_object(
    'success', true,
    'target_date', p_target_date,
    'affected_stores', v_affected_stores,
    'was_closed', v_is_closed
  );
END;
$$;

-- 8. RPC: get_ofx_balance_rules
CREATE OR REPLACE FUNCTION public.get_ofx_balance_rules(
  p_account_keys text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  account_key text,
  store_id text,
  source_kind text,
  memo_normalized text,
  date_role text,
  is_active boolean,
  version int,
  updated_by text,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    r.id,
    r.account_key,
    r.store_id,
    r.source_kind,
    r.memo_normalized,
    r.date_role,
    r.is_active,
    r.version,
    r.updated_by,
    r.updated_at
  FROM public.ofx_balance_rules r
  WHERE r.is_active = true
    AND (p_account_keys IS NULL OR r.account_key = ANY(p_account_keys))
  ORDER BY r.account_key;
$$;

-- 9. RPC: get_ofx_account_history
CREATE OR REPLACE FUNCTION public.get_ofx_account_history(
  p_account_key text,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  account_key text,
  store_id text,
  reconciliation_date date,
  previous_amount numeric,
  new_amount numeric,
  selection_mode text,
  reason text,
  actor_id text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    e.id,
    e.account_key,
    e.store_id,
    e.reconciliation_date,
    e.previous_amount,
    e.new_amount,
    e.selection_mode,
    e.reason,
    e.actor_id,
    e.created_at
  FROM public.ofx_balance_selection_events e
  WHERE e.account_key = p_account_key
  ORDER BY e.created_at DESC
  LIMIT p_limit;
$$;
