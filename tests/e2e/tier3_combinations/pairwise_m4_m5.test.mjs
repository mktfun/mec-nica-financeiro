// tests/e2e/tier3_combinations/pairwise_m4_m5.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { supabase, querySql } from '../harness/client.mjs';
import { MOCK_OFX_TX, MOCK_POS_TX } from '../harness/fixtures.mjs';
import { CANONICAL_MATCH_STATUSES } from '../harness/config.mjs';

describe('Tier 3 — Pairwise Combination: M4 Status Standardization ↔ M5 Physical Table Writes', () => {

  it('Pair-M4-M5-01: inserting into ofx_transactions with canonical match_status succeeds', async () => {
    const testFitid = 'TEST_M4M5_OK_' + Date.now();
    const payload = {
      ...MOCK_OFX_TX,
      fitid: testFitid,
      match_status: 'pending'
    };
    const { data, error } = await supabase.from('ofx_transactions').insert([payload]).select('id, match_status').single();
    assert.ok(!error, `Insert with canonical match_status failed: ${error?.message}`);
    assert.strictEqual(data?.match_status, 'pending');

    // Cleanup
    if (data?.id) {
      await supabase.from('ofx_transactions').delete().eq('id', data.id);
    }
  });

  it('Pair-M4-M5-02: updating ofx_transactions match_status to "matched" succeeds', async () => {
    const testFitid = 'TEST_M4M5_UPDATE_' + Date.now();
    const payload = { ...MOCK_OFX_TX, fitid: testFitid, match_status: 'pending' };
    const insertRes = await supabase.from('ofx_transactions').insert([payload]).select('id').single();
    assert.ok(!insertRes.error);

    const updateRes = await supabase
      .from('ofx_transactions')
      .update({ match_status: 'matched' })
      .eq('id', insertRes.data.id)
      .select('match_status')
      .single();

    assert.ok(!updateRes.error);
    assert.strictEqual(updateRes.data.match_status, 'matched');

    // Cleanup
    await supabase.from('ofx_transactions').delete().eq('id', insertRes.data.id);
  });

  it('Pair-M4-M5-03: all canonical match statuses are accepted in ofx_transactions mutations', async () => {
    for (const status of ['pending', 'matched', 'batch', 'intercompany', 'cancelled', 'ignored']) {
      const testFitid = `TEST_M4M5_${status.toUpperCase()}_${Date.now()}`;
      const payload = { ...MOCK_OFX_TX, fitid: testFitid, match_status: status };
      const res = await supabase.from('ofx_transactions').insert([payload]).select('id').single();
      assert.ok(!res.error, `Failed inserting status '${status}': ${res.error?.message}`);

      // Cleanup
      if (res.data?.id) {
        await supabase.from('ofx_transactions').delete().eq('id', res.data.id);
      }
    }
  });

  it('Pair-M4-M5-04: pos_transactions updates preserve canonical settlement_status', async () => {
    const testHash = 'TEST_M4M5_POS_' + Date.now();
    const payload = { ...MOCK_POS_TX, dedup_hash: testHash, settlement_status: 'a_compensar' };
    const insertRes = await supabase.from('pos_transactions').insert([payload]).select('id').single();
    assert.ok(!insertRes.error);

    const updateRes = await supabase
      .from('pos_transactions')
      .update({ settlement_status: 'liquidado' })
      .eq('id', insertRes.data.id)
      .select('settlement_status')
      .single();

    assert.ok(!updateRes.error);
    assert.strictEqual(updateRes.data.settlement_status, 'liquidado');

    // Cleanup
    await supabase.from('pos_transactions').delete().eq('id', insertRes.data.id);
  });

  it('Pair-M4-M5-05: physical tables retain only canonical statuses across recent records', async () => {
    const { data, error } = await supabase
      .from('ofx_transactions')
      .select('match_status')
      .order('created_at', { ascending: false })
      .limit(50);
    assert.ok(!error);
    for (const row of data || []) {
      if (row.match_status) {
        assert.ok(
          CANONICAL_MATCH_STATUSES.includes(row.match_status),
          `Found non-canonical match_status '${row.match_status}' in recent physical table rows`
        );
      }
    }
  });
});
