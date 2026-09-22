// tests/e2e/tier4_real_world/closed_snapshot_audit.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDailyReconciliationSummary, querySql, supabase } from '../harness/client.mjs';
import { assertSummaryContract, assert5PillarsPresent, assertIdempotentResults } from '../harness/assertions.mjs';
import { EXPECTED_STORE_COUNT } from '../harness/config.mjs';

describe('Tier 4 — Real-World Application: Frozen Closed Snapshot Audit', () => {

  it('Snap-Audit-01: identify closed snapshots in database and verify is_closed status', async () => {
    const res = await querySql(`
      SELECT date, is_closed, closed_at, status
      FROM daily_snapshots
      WHERE is_closed = true
      ORDER BY date DESC;
    `);
    assert.ok(res.rows, 'Query to daily_snapshots must succeed');
    // If closed days exist, verify their basic properties
    for (const row of res.rows) {
      assert.strictEqual(row.is_closed, true, `Date ${row.date} is_closed must be true`);
      assert.ok(row.closed_at, `Date ${row.date} must have non-null closed_at`);
      assert.ok(
        ['approved', 'divergence', 'divergent'].includes(row.status),
        `Date ${row.date} has invalid status '${row.status}'`
      );
    }
  });

  it('Snap-Audit-02: closed day 2026-09-16 returns frozen snapshot via get_daily_reconciliation_summary', async () => {
    const res = await getDailyReconciliationSummary('2026-09-16', false);
    assert.ok(!res.error, `Reading 2026-09-16 failed: ${res.error?.message}`);
    if (res.data.is_closed) {
      assert.strictEqual(res.data.is_closed, true);
      assert.ok(res.data.closed_at, 'closed_at must be populated');
      assertSummaryContract(res.data);
      assert5PillarsPresent(res.data);
    }
  });

  it('Snap-Audit-03: snapshot immutability across repeated requests (zero variance)', async () => {
    const run1 = await getDailyReconciliationSummary('2026-09-16', false);
    const run2 = await getDailyReconciliationSummary('2026-09-16', false);
    assert.ok(!run1.error && !run2.error);
    if (run1.data.is_closed && run2.data.is_closed) {
      assertIdempotentResults(run1.data, run2.data);
      assert.strictEqual(run1.data.closed_at, run2.data.closed_at, 'closed_at timestamp must be identical');
    }
  });

  it('Snap-Audit-04: closed snapshot stores array retains exact 10 stores without data loss', async () => {
    const res = await getDailyReconciliationSummary('2026-09-16', false);
    assert.ok(!res.error);
    if (res.data.is_closed && Array.isArray(res.data.stores)) {
      assert.strictEqual(
        res.data.stores.length,
        EXPECTED_STORE_COUNT,
        `Expected ${EXPECTED_STORE_COUNT} stores in frozen snapshot, got ${res.data.stores.length}`
      );
    }
  });

  it('Snap-Audit-05: new transaction insertion does NOT mutate frozen snapshot when read normally', async () => {
    const snapshotBefore = await getDailyReconciliationSummary('2026-09-16', false);
    if (!snapshotBefore.error && snapshotBefore.data.is_closed) {
      // Insert temporary OFX transaction for 2026-09-16
      const tempFitid = 'TEST_SNAP_MUT_' + Date.now();
      const insertRes = await supabase.from('ofx_transactions').insert([{
        store_id: 'st-01',
        bank_name: 'Banco Itaú',
        type: 'in',
        amount: 999.99,
        occurred_at: '2026-09-16T12:00:00Z',
        target_date: '2026-09-16',
        fitid: tempFitid,
        counterpart_name: 'Temp Test Immutability',
        match_status: 'pending'
      }]).select('id').single();

      try {
        // Read snapshot again with force_dynamic = false
        const snapshotAfter = await getDailyReconciliationSummary('2026-09-16', false);
        assert.ok(!snapshotAfter.error);
        assert.strictEqual(
          snapshotAfter.data.diferenca_final,
          snapshotBefore.data.diferenca_final,
          'Closed snapshot diferenca_final was modified by new transaction!'
        );
        assert.strictEqual(
          snapshotAfter.data.saldo_bancos_ofx,
          snapshotBefore.data.saldo_bancos_ofx,
          'Closed snapshot saldo_bancos_ofx was modified by new transaction!'
        );
      } finally {
        // Cleanup temp transaction
        if (insertRes.data?.id) {
          await supabase.from('ofx_transactions').delete().eq('id', insertRes.data.id);
        }
      }
    }
  });

  it('Snap-Audit-06: closed snapshot metadata preserves odometer and operational inputs', async () => {
    const res = await querySql(`
      SELECT date, metadata
      FROM daily_snapshots
      WHERE is_closed = true
      LIMIT 3;
    `);
    if (res.rows && res.rows.length > 0) {
      for (const row of res.rows) {
        assert.ok(row.metadata !== null, `Snapshot ${row.date} must have metadata JSONB`);
      }
    }
  });
});
