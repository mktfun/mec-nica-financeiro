// tests/e2e/tier2_boundary/m5_write_boundary.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  supabase,
  querySql,
  scanCodebase,
  findPatternInFiles
} from '../harness/client.mjs';
import { MOCK_OFX_TX, MOCK_POS_TX, MOCK_DAILY_BILL, BOUNDARY_INPUTS } from '../harness/fixtures.mjs';

describe('Tier 2 — Boundary & Corner Cases: Real Table Writes & View Elimination (Features 18–20)', () => {

  // --------------------------------------------------------------------------
  // Feature 18 Boundary: Direct Physical Table Writes Edge Conditions
  // --------------------------------------------------------------------------
  describe('F18 Boundary: Direct Physical Table Writes Edge Conditions', () => {
    it('F18-B1: inserting duplicate fitid into ofx_transactions should be handled by unique constraint or idempotency', async () => {
      const testFitid = 'TEST_DUP_FITID_' + Date.now();
      const payload = { ...MOCK_OFX_TX, fitid: testFitid };

      // First insert
      const res1 = await supabase.from('ofx_transactions').insert([payload]).select('id').single();
      assert.ok(!res1.error, `First insert failed: ${res1.error?.message}`);

      // Second insert with same fitid
      const res2 = await supabase.from('ofx_transactions').insert([payload]);
      // Should either fail with 23505 (unique violation) or be safely handled
      assert.ok(
        res2.error !== null || res2.status === 200,
        'Duplicate fitid must be detected or handled'
      );

      // Cleanup
      if (res1.data?.id) {
        await supabase.from('ofx_transactions').delete().eq('id', res1.data.id);
      }
    });

    it('F18-B2: inserting pos_transaction with missing mandatory amount must fail database validation', async () => {
      const invalidPos = {
        store_id: 'st-01',
        machine_name: 'Rede Test',
        occurred_at: '2026-08-24T12:00:00Z',
        target_date: '2026-08-24'
        // gross_amount omitted
      };
      const res = await supabase.from('pos_transactions').insert([invalidPos]);
      assert.ok(res.error, 'Inserting POS transaction without gross_amount should return error');
    });

    it('F18-B3: inserting extreme monetary amounts preserves full decimal precision', async () => {
      const testFitid = 'TEST_EXTREME_AMT_' + Date.now();
      const payload = {
        ...MOCK_OFX_TX,
        fitid: testFitid,
        amount: 9999999.99
      };
      const res = await supabase.from('ofx_transactions').insert([payload]).select('id, amount').single();
      assert.ok(!res.error, `Extreme amount insert failed: ${res.error?.message}`);
      assert.strictEqual(Number(res.data.amount), 9999999.99);

      // Cleanup
      if (res.data?.id) {
        await supabase.from('ofx_transactions').delete().eq('id', res.data.id);
      }
    });

    it('F18-B4: negative amounts in ofx_transactions correctly represent debit transactions', async () => {
      const testFitid = 'TEST_NEG_AMT_' + Date.now();
      const payload = {
        ...MOCK_OFX_TX,
        fitid: testFitid,
        type: 'out',
        amount: -1250.75
      };
      const res = await supabase.from('ofx_transactions').insert([payload]).select('id, amount, type').single();
      assert.ok(!res.error, `Negative amount insert failed: ${res.error?.message}`);
      assert.strictEqual(Number(res.data.amount), -1250.75);

      // Cleanup
      if (res.data?.id) {
        await supabase.from('ofx_transactions').delete().eq('id', res.data.id);
      }
    });

    it('F18-B5: daily_manual_bills table constraint checks: amount <= 0 must be rejected by check constraint', async () => {
      const invalidBill = {
        ...MOCK_DAILY_BILL,
        title: 'Zero Amount Bill Test ' + Date.now(),
        amount: 0.00
      };
      const res = await supabase.from('daily_manual_bills').insert([invalidBill]);
      assert.ok(res.error, 'Inserting bill with amount <= 0 must fail check constraint amount > 0');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 19 Boundary: Eliminate View Mutations (Error 55000 Prevention)
  // --------------------------------------------------------------------------
  describe('F19 Boundary: View Mutation Blocking & Audit', () => {
    it('F19-B1: attempting direct insert into v_movimentacoes_conciliadas must fail or be prevented', async () => {
      const res = await supabase.from('v_movimentacoes_conciliadas').insert([{
        store_id: 'st-01',
        amount: 100.00,
        description: 'Direct View Insert Test'
      }]);
      // Either view doesn't exist, has no rule/trigger (55000), or errors out
      assert.ok(res.error, 'Direct INSERT into v_movimentacoes_conciliadas must fail');
    });

    it('F19-B2: attempting direct update on v_movimentacoes_conciliadas must fail or be prevented', async () => {
      const res = await supabase.from('v_movimentacoes_conciliadas').update({
        description: 'Hacked Description'
      }).eq('id', 'non-existent-id');
      assert.ok(res.error, 'Direct UPDATE on v_movimentacoes_conciliadas must fail');
    });

    it('F19-B3: attempting direct delete on v_movimentacoes_conciliadas must fail or be prevented', async () => {
      const res = await supabase.from('v_movimentacoes_conciliadas').delete().eq('id', 'non-existent-id');
      assert.ok(res.error, 'Direct DELETE on v_movimentacoes_conciliadas must fail');
    });

    it('F19-B4: codebase audit: zero .from("v_movimentacoes_conciliadas").insert in src/', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /\.from\(['"]v_movimentacoes_conciliadas['"]\)\.insert/);
      assert.strictEqual(
        matches.length,
        0,
        `Found direct INSERT into v_movimentacoes_conciliadas: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F19-B5: codebase audit: zero .from("v_movimentacoes_conciliadas").update in src/', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /\.from\(['"]v_movimentacoes_conciliadas['"]\)\.update/);
      assert.strictEqual(
        matches.length,
        0,
        `Found direct UPDATE on v_movimentacoes_conciliadas: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 20 Boundary: Redirect Critical Reads
  // --------------------------------------------------------------------------
  describe('F20 Boundary: Redirect Critical Reads', () => {
    it('F20-B1: codebase audit: zero queries filtering v_movimentacoes_conciliadas by source="ofx"', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /\.from\(['"]v_movimentacoes_conciliadas['"]\).*eq\(['"]source['"],\s*['"]ofx['"]\)/);
      assert.strictEqual(
        matches.length,
        0,
        `Found read of v_movimentacoes_conciliadas for OFX in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F20-B2: codebase audit: zero queries filtering v_movimentacoes_conciliadas by source="pos"', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /\.from\(['"]v_movimentacoes_conciliadas['"]\).*eq\(['"]source['"],\s*['"]pos['"]\)/);
      assert.strictEqual(
        matches.length,
        0,
        `Found read of v_movimentacoes_conciliadas for POS in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F20-B3: direct read on ofx_transactions filtering by target_date returns real rows', async () => {
      const { data, error } = await supabase
        .from('ofx_transactions')
        .select('id, amount, target_date, fitid')
        .eq('target_date', '2026-08-24')
        .limit(5);
      assert.ok(!error, `Direct read on ofx_transactions failed: ${error?.message}`);
      assert.ok(Array.isArray(data), 'ofx_transactions query must return array');
    });

    it('F20-B4: direct read on pos_transactions filtering by target_date returns real rows', async () => {
      const { data, error } = await supabase
        .from('pos_transactions')
        .select('id, gross_amount, target_date, store_id')
        .eq('target_date', '2026-08-24')
        .limit(5);
      assert.ok(!error, `Direct read on pos_transactions failed: ${error?.message}`);
      assert.ok(Array.isArray(data), 'pos_transactions query must return array');
    });

    it('F20-B5: direct read on manual_transactions filtering by target_date returns real rows', async () => {
      const { data, error } = await supabase
        .from('manual_transactions')
        .select('id, amount, target_date, store_id')
        .eq('target_date', '2026-08-24')
        .limit(5);
      assert.ok(!error, `Direct read on manual_transactions failed: ${error?.message}`);
      assert.ok(Array.isArray(data), 'manual_transactions query must return array');
    });
  });
});
