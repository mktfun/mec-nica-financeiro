// tests/e2e/tier3_combinations/pairwise_m1_m2.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { getDailyReconciliationSummary, scanCodebase, findPatternInFiles } from '../harness/client.mjs';
import { assertSummaryContract, assert5PillarsPresent, assertStoresArrayValid } from '../harness/assertions.mjs';

describe('Tier 3 — Pairwise Combination: M1 SSOT Calculator ↔ M2 Frontend SSOT Hook', () => {

  it('Pair-M1-M2-01: RPC summary payload satisfies the TypeScript interface contract expected by frontend', async () => {
    const res = await getDailyReconciliationSummary('2026-08-24', false);
    assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
    assertSummaryContract(res.data);
    assert5PillarsPresent(res.data);
  });

  it('Pair-M1-M2-02: dual bank split (saldo_positivo_real, saldo_devedor_real) matches modal props', async () => {
    const res = await getDailyReconciliationSummary('2026-08-24', false);
    assert.ok(!res.error);
    const stores = res.data.stores || [];
    assert.ok(stores.length > 0, 'Stores must be present');
    for (const s of stores) {
      assert.strictEqual(typeof s.saldo_positivo_real, 'number', `Store ${s.store_name} saldo_positivo_real must be numeric`);
      assert.strictEqual(typeof s.saldo_devedor_real, 'number', `Store ${s.store_name} saldo_devedor_real must be numeric`);
      assert.ok(s.saldo_positivo_real >= 0, `saldo_positivo_real must be >= 0 in ${s.store_name}`);
      assert.ok(s.saldo_devedor_real >= 0, `saldo_devedor_real must be >= 0 in ${s.store_name}`);
    }
  });

  it('Pair-M1-M2-03: stores array matches ConciliacaoLojasView layout without requiring frontend aggregation', async () => {
    const res = await getDailyReconciliationSummary('2026-08-24', false);
    assert.ok(!res.error);
    assertStoresArrayValid(res.data.stores);
  });

  it('Pair-M1-M2-04: status_geral directly supplies status indicator in ResumoDiaPanel without re-derivation', async () => {
    const res = await getDailyReconciliationSummary('2026-08-24', false);
    assert.ok(!res.error);
    assert.ok(
      ['approved', 'divergence'].includes(res.data.status_geral),
      `status_geral must be strictly 'approved' or 'divergence', got '${res.data.status_geral}'`
    );
  });

  it('Pair-M1-M2-05: cache key compatibility between frontend useQuery and DB RPC name', () => {
    const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
    if (fs.existsSync(hookPath)) {
      const content = fs.readFileSync(hookPath, 'utf8');
      assert.ok(
        content.includes('daily_reconciliation_summary'),
        'Frontend query key prefix must match canonical RPC identifier'
      );
    }
  });
});
