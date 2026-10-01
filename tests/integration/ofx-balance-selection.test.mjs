// tests/integration/ofx-balance-selection.test.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Spec 462 — Integração: apply_ofx_balance_selection & Idempotência', () => {
  const TEST_DATE = '2099-12-31';
  const STORE_ID = 'st-01'; // Filial Santo André
  const ACCT_KEY_A = 'TEST_ACCT_SANTO_ANDRE_01';
  const ACCT_KEY_B = 'TEST_ACCT_SANTO_ANDRE_02';

  async function cleanup() {
    await supabase.from('ofx_balance_rules').delete().in('account_key', [ACCT_KEY_A, ACCT_KEY_B]);
    await supabase.from('ofx_balance_selections').delete().eq('reconciliation_date', TEST_DATE);
    await supabase.from('ofx_balance_selection_events').delete().eq('reconciliation_date', TEST_DATE);
    await supabase.from('reconciliations').delete().eq('date', TEST_DATE);
    await supabase.from('daily_snapshots').delete().eq('date', TEST_DATE);
  }

  before(async () => {
    await cleanup();
  });

  after(async () => {
    await cleanup();
  });

  it('1. Deve executar apply_ofx_balance_selection sem erro 42703 (updated_at ausente em reconciliations)', async () => {
    const payload = [
      {
        account_key: ACCT_KEY_A,
        store_id: STORE_ID,
        source_kind: 'STMTTRN_MEMO',
        balance_role: 'CLOSING',
        memo_raw: 'SALDO FINAL DO DIA CONTA 1',
        memo_normalized: 'SALDO FINAL CONTA 1',
        posted_date: TEST_DATE,
        amount: 1500.00,
        remember_rule: true,
        selection_mode: 'manual'
      }
    ];

    const { data, error } = await supabase.rpc('apply_ofx_balance_selection', {
      p_selections: payload,
      p_target_date: TEST_DATE,
      p_reason: 'Teste Automatizado Spec 462'
    });

    assert.ifError(error);
    assert.ok(data, 'Deve retornar payload de resposta da RPC');
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.target_date, TEST_DATE);
    assert.ok(data.affected_stores.includes(STORE_ID));
  });

  it('2. Deve somar algebricamente duas contas na mesma filial (1500.00 + (-300.00) = 1200.00)', async () => {
    const payload = [
      {
        account_key: ACCT_KEY_A,
        store_id: STORE_ID,
        source_kind: 'STMTTRN_MEMO',
        balance_role: 'CLOSING',
        memo_raw: 'SALDO FINAL POSITIVO',
        memo_normalized: 'SALDO FINAL POSITIVO',
        posted_date: TEST_DATE,
        amount: 1500.00,
        remember_rule: true,
        selection_mode: 'manual'
      },
      {
        account_key: ACCT_KEY_B,
        store_id: STORE_ID,
        source_kind: 'STMTTRN_MEMO',
        balance_role: 'CLOSING',
        memo_raw: 'SALDO NEGATIVO CHEQUE ESPECIAL',
        memo_normalized: 'SALDO NEGATIVO CHEQUE ESPECIAL',
        posted_date: TEST_DATE,
        amount: -300.00,
        remember_rule: false,
        selection_mode: 'manual'
      }
    ];

    const { data, error } = await supabase.rpc('apply_ofx_balance_selection', {
      p_selections: payload,
      p_target_date: TEST_DATE,
      p_reason: 'Teste Soma Algébrica Spec 462'
    });

    assert.ifError(error);
    assert.strictEqual(data.success, true);

    const { data: recs, error: recErr } = await supabase
      .from('reconciliations')
      .select('store_id, bank_total, date')
      .eq('date', TEST_DATE)
      .eq('store_id', STORE_ID);

    assert.ifError(recErr);
    assert.strictEqual(recs.length, 1, 'Deve existir exatamente 1 registro para a filial');
    assert.strictEqual(Number(recs[0].bank_total), 1200.00, 'bank_total deve ser exatamente 1500.00 + (-300.00) = 1200.00');

    // Verifica regras ativas
    const { data: rulesA } = await supabase
      .from('ofx_balance_rules')
      .select('*')
      .eq('account_key', ACCT_KEY_A)
      .eq('is_active', true);
    assert.strictEqual(rulesA.length, 1, 'Conta A (remember_rule=true) deve ter exatamente 1 regra ativa');
    assert.strictEqual(rulesA[0].is_active, true);

    const { data: rulesB } = await supabase
      .from('ofx_balance_rules')
      .select('*')
      .eq('account_key', ACCT_KEY_B);
    assert.strictEqual(rulesB.length, 0, 'Conta B (remember_rule=false) NÃO deve ter regra criada');
  });

  it('3. Deve ser idempotente na repetição (retry): não duplica versão de regra com mesmos atributos', async () => {
    const { data: ruleBefore } = await supabase
      .from('ofx_balance_rules')
      .select('id, version, updated_at')
      .eq('account_key', ACCT_KEY_A)
      .eq('is_active', true)
      .single();

    assert.ok(ruleBefore, 'Regra ativa prévia deve existir');
    const versionBefore = ruleBefore.version;

    const retryPayload = [
      {
        account_key: ACCT_KEY_A,
        store_id: STORE_ID,
        source_kind: 'STMTTRN_MEMO',
        balance_role: 'CLOSING',
        memo_raw: 'SALDO FINAL POSITIVO',
        memo_normalized: 'SALDO FINAL POSITIVO',
        posted_date: TEST_DATE,
        amount: 1500.00,
        remember_rule: true,
        selection_mode: 'manual'
      }
    ];

    const { data, error } = await supabase.rpc('apply_ofx_balance_selection', {
      p_selections: retryPayload,
      p_target_date: TEST_DATE,
      p_reason: 'Retry Idempotente Test'
    });

    assert.ifError(error);
    assert.strictEqual(data.success, true);

    const { data: ruleAfter } = await supabase
      .from('ofx_balance_rules')
      .select('id, version, updated_at')
      .eq('account_key', ACCT_KEY_A)
      .eq('is_active', true)
      .single();

    assert.strictEqual(
      ruleAfter.version, 
      versionBefore, 
      'A versão da regra não deve ser incrementada em retries com mesmos atributos'
    );
  });
});
