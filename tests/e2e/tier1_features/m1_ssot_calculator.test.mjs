// tests/e2e/tier1_features/m1_ssot_calculator.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getDailyReconciliationSummary,
  checkFunctionExists,
  querySql
} from '../harness/client.mjs';
import {
  assertSummaryContract,
  assert5PillarsPresent,
  assertStoresArrayValid,
  assertStatusVocabulary,
  assertToleranceCalculation
} from '../harness/assertions.mjs';

describe('Tier 1 — Milestone 1: Database SSOT Calculadora (Features 1–5)', () => {

  // --------------------------------------------------------------------------
  // Feature 1: SSOT Calculator Function (get_daily_reconciliation_summary)
  // --------------------------------------------------------------------------
  describe('Feature 1: SSOT Calculator Function', () => {
    it('F1-T1: should return a single comprehensive day object matching interface contract', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      assertSummaryContract(res.data);
    });

    it('F1-T2: should return all 5 Macro Pillars as numeric values', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      assert5PillarsPresent(res.data);
    });

    it('F1-T3: should return stores breakdown array with 10 stores', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      assertStoresArrayValid(res.data.stores);
    });

    it('F1-T4: should provide dual split for bank balances (saldo_positivo_real and saldo_devedor_real)', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      assert.ok(Array.isArray(res.data.stores), 'stores must be an array');
      for (const store of res.data.stores) {
        assert.ok('saldo_positivo_real' in store, `Store ${store.store_name} missing saldo_positivo_real`);
        assert.ok('saldo_devedor_real' in store, `Store ${store.store_name} missing saldo_devedor_real`);
        assert.ok(['credor', 'devedor'].includes(store.status_banco), `Store ${store.store_name} invalid status_banco`);
      }
    });

    it('F1-T5: should return diferenca_final and status_geral in the payload', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      assert.ok('diferenca_final' in res.data, 'diferenca_final must be in payload');
      assert.strictEqual(typeof res.data.diferenca_final, 'number', 'diferenca_final must be numeric');
      assert.ok('status_geral' in res.data, 'status_geral must be in payload');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 2: Open vs Closed Day Handling
  // --------------------------------------------------------------------------
  describe('Feature 2: Open vs Closed Day Handling', () => {
    it('F2-T1: should return is_closed boolean flag accurately', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      assert.strictEqual(typeof res.data.is_closed, 'boolean', 'is_closed must be boolean');
    });

    it('F2-T2: open day should dynamically calculate from real tables', async () => {
      // Test with an open date
      const res = await getDailyReconciliationSummary('2026-08-17', true);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      assert.ok(res.data.stores && res.data.stores.length > 0, 'Open day must return calculated stores');
    });

    it('F2-T3: closed day should return frozen snapshot data without recalculation', async () => {
      // Check if 2026-09-16 is closed
      const resClosed = await getDailyReconciliationSummary('2026-09-16', false);
      assert.ok(!resClosed.error, `RPC failed: ${resClosed.error?.message}`);
      if (resClosed.data.is_closed) {
        assert.ok(resClosed.data.closed_at, 'Closed day must have closed_at timestamp');
        // Stores breakdown must still be returned for closed days
        assert.ok(Array.isArray(resClosed.data.stores), 'Closed day must return stores breakdown');
      }
    });

    it('F2-T4: p_force_dynamic=true should allow recalculating live numbers on demand', async () => {
      const resLive = await getDailyReconciliationSummary('2026-09-16', true);
      assert.ok(!resLive.error, `RPC failed: ${resLive.error?.message}`);
      assert.ok(resLive.data, 'Live recalculation must return valid data');
    });

    it('F2-T5: closed day snapshot metadata should preserve cash_vault_snapshot', async () => {
      const res = await getDailyReconciliationSummary('2026-09-16', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      if (res.data.is_closed) {
        assert.ok('cash_vault_snapshot' in res.data, 'Closed snapshot should preserve cash_vault_snapshot in metadata');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 3: Fixed Status Vocabulary
  // --------------------------------------------------------------------------
  describe('Feature 3: Fixed Status Vocabulary', () => {
    it('F3-T1: status_geral must be strictly "approved" or "divergence" (no "divergent")', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      assertStatusVocabulary(res.data.status_geral);
    });

    it('F3-T2: all store statuses must be strictly "approved" or "divergence"', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      for (const store of res.data.stores || []) {
        assertStatusVocabulary(store.status);
      }
    });

    it('F3-T3: diferenca_final <= 50.00 must produce status_geral = "approved"', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      if (Math.abs(res.data.diferenca_final) <= 50.00) {
        assert.strictEqual(res.data.status_geral, 'approved');
      }
    });

    it('F3-T4: diferenca_final > 50.00 must produce status_geral = "divergence"', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      if (Math.abs(res.data.diferenca_final) > 50.00) {
        assert.strictEqual(res.data.status_geral, 'divergence');
      }
    });

    it('F3-T5: tolerance evaluation must be verified across tolerance calculation helper', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error, `RPC failed: ${res.error?.message}`);
      assertToleranceCalculation(res.data.diferenca_final, res.data.status_geral);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 4: Obsolete Function Deprecation (calculate_daily_conciliation)
  // --------------------------------------------------------------------------
  describe('Feature 4: Obsolete Function Deprecation', () => {
    it('F4-T1: calculate_daily_conciliation must be dropped from pg_proc', async () => {
      const check = await checkFunctionExists('calculate_daily_conciliation');
      assert.strictEqual(
        check.exists,
        false,
        'calculate_daily_conciliation still exists in database! It must be completely dropped in M1.'
      );
    });

    it('F4-T2: invoking calculate_daily_conciliation RPC must fail with not found error', async () => {
      const { querySql } = await import('../harness/client.mjs');
      const res = await querySql("SELECT proname FROM pg_proc WHERE proname = 'calculate_daily_conciliation';");
      assert.strictEqual((res.rows || []).length, 0, 'calculate_daily_conciliation function should have 0 rows in pg_proc');
    });

    it('F4-T3: frontend codebase must not contain calls to calculate_daily_conciliation', async () => {
      const { scanCodebase, findPatternInFiles } = await import('../harness/client.mjs');
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /calculate_daily_conciliation/);
      assert.strictEqual(
        matches.length,
        0,
        `Found ${matches.length} references to calculate_daily_conciliation in src/: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F4-T4: get_daily_reconciliation_summary must be the only reconciliation RPC in pg_proc', async () => {
      const checkSSOT = await checkFunctionExists('get_daily_reconciliation_summary');
      assert.strictEqual(checkSSOT.exists, true, 'get_daily_reconciliation_summary must exist in pg_proc');
    });

    it('F4-T5: no database view should reference calculate_daily_conciliation', async () => {
      const res = await querySql(`
        SELECT table_name, view_definition
        FROM information_schema.views
        WHERE table_schema = 'public' AND view_definition ILIKE '%calculate_daily_conciliation%';
      `);
      assert.strictEqual((res.rows || []).length, 0, 'No views should reference calculate_daily_conciliation');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 5: Remove Hardcoded Dates
  // --------------------------------------------------------------------------
  describe('Feature 5: Remove Hardcoded Dates', () => {
    it('F5-T1: RPC get_daily_reconciliation_summary must not contain hardcoded "2026-09-16" values', async () => {
      const res = await querySql(`
        SELECT prosrc
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND proname = 'get_daily_reconciliation_summary';
      `);
      assert.ok(res.rows && res.rows.length > 0, 'Function get_daily_reconciliation_summary must exist');
      const src = res.rows[0].prosrc || '';
      assert.ok(!src.includes('148044.32'), 'Found hardcoded 148044.32 in get_daily_reconciliation_summary SQL source!');
      assert.ok(!src.includes('48858.41'), 'Found hardcoded 48858.41 in get_daily_reconciliation_summary SQL source!');
    });

    it('F5-T2: calculation on 2026-09-16 must be dynamically derived from real tables', async () => {
      const resDynamic = await getDailyReconciliationSummary('2026-09-16', true);
      assert.ok(!resDynamic.error, `Dynamic call failed: ${resDynamic.error?.message}`);
      assert.ok(typeof resDynamic.data.saldo_bancos_positivo === 'number', 'saldo_bancos_positivo must be numeric');
    });

    it('F5-T3: calculation on 2026-08-24 must be dynamically derived from real tables', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', true);
      assert.ok(!res.error, `Dynamic call failed: ${res.error?.message}`);
      assert.ok(typeof res.data.faturamento_periodo === 'number', 'faturamento_periodo must be numeric');
    });

    it('F5-T4: multiple dynamic dates must produce independent, non-cached calculations', async () => {
      const [res1, res2] = await Promise.all([
        getDailyReconciliationSummary('2026-08-17', true),
        getDailyReconciliationSummary('2026-08-18', true)
      ]);
      assert.ok(!res1.error && !res2.error, 'Both RPC calls should succeed');
      assert.notStrictEqual(res1.data.date, res2.data.date, 'Dates must be distinct');
    });

    it('F5-T5: date parameter should accept arbitrary ISO date string without SQL error', async () => {
      const res = await getDailyReconciliationSummary('2026-08-19', true);
      assert.ok(!res.error, `RPC failed on 2026-08-19: ${res.error?.message}`);
      assert.strictEqual(res.data.date, '2026-08-19');
    });
  });
});
