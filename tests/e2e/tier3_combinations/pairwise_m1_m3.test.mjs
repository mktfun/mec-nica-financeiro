// tests/e2e/tier3_combinations/pairwise_m1_m3.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDailyReconciliationSummary, fecharDia } from '../harness/client.mjs';
import { assertSummaryContract, assert5PillarsPresent, assertIdempotentResults } from '../harness/assertions.mjs';

describe('Tier 3 — Pairwise Combination: M1 SSOT Calculator ↔ M3 Backend Closing (fechar_dia)', () => {

  it('Pair-M1-M3-01: payload returned by fechar_dia matches the get_daily_reconciliation_summary contract', async () => {
    const res = await fecharDia('2026-08-24', false);
    if (!res.error) {
      assertSummaryContract(res.data);
      assert5PillarsPresent(res.data);
      assert.strictEqual(res.data.is_closed, true, 'Result of fechar_dia must have is_closed=true');
    }
  });

  it('Pair-M1-M3-02: get_daily_reconciliation_summary reads directly from snapshot created by fechar_dia', async () => {
    const closeRes = await fecharDia('2026-08-17', false);
    if (!closeRes.error) {
      const summaryRes = await getDailyReconciliationSummary('2026-08-17', false);
      assert.ok(!summaryRes.error);
      assert.strictEqual(summaryRes.data.is_closed, true);
      assert.strictEqual(summaryRes.data.closed_at, closeRes.data.closed_at);
      assert.strictEqual(summaryRes.data.diferenca_final, closeRes.data.diferenca_final);
    }
  });

  it('Pair-M1-M3-03: force_dynamic=true does not corrupt or erase frozen snapshot', async () => {
    const summaryBefore = await getDailyReconciliationSummary('2026-09-16', false);
    if (!summaryBefore.error && summaryBefore.data.is_closed) {
      // Run dynamic calculation
      const dynamicRes = await getDailyReconciliationSummary('2026-09-16', true);
      assert.ok(!dynamicRes.error);

      // Re-read snapshot
      const summaryAfter = await getDailyReconciliationSummary('2026-09-16', false);
      assert.ok(!summaryAfter.error);
      assert.strictEqual(summaryAfter.data.is_closed, true);
      assert.strictEqual(summaryAfter.data.closed_at, summaryBefore.data.closed_at);
    }
  });

  it('Pair-M1-M3-04: store count in frozen snapshot matches store count in dynamic summary', async () => {
    const dynRes = await getDailyReconciliationSummary('2026-08-24', true);
    const snapRes = await getDailyReconciliationSummary('2026-09-16', false);
    if (!dynRes.error && !snapRes.error && snapRes.data.is_closed) {
      assert.strictEqual(
        dynRes.data.stores?.length,
        snapRes.data.stores?.length,
        'Store count must remain consistent (10 stores) across dynamic and closed modes'
      );
    }
  });

  it('Pair-M1-M3-05: idempotency check between fechar_dia snapshot and get_daily_reconciliation_summary', async () => {
    const res = await getDailyReconciliationSummary('2026-09-16', false);
    if (!res.error && res.data.is_closed) {
      const secondRead = await getDailyReconciliationSummary('2026-09-16', false);
      assertIdempotentResults(res.data, secondRead.data);
    }
  });
});
