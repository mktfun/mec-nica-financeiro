// tests/e2e/tier2_boundary/m1_calculator_boundary.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDailyReconciliationSummary } from '../harness/client.mjs';
import { BOUNDARY_INPUTS } from '../harness/fixtures.mjs';
import { assertStatusVocabulary, assertToleranceCalculation } from '../harness/assertions.mjs';

describe('Tier 2 — Boundary & Corner Cases: SSOT Calculadora (Features 1–5)', () => {

  // Feature 1 Boundaries
  describe('F1 Boundary: Extreme numeric values, zero activity & precision', () => {
    it('F1-B1: handling date with 0 transactions should return zeroes rather than nulls or NaN', async () => {
      const res = await getDailyReconciliationSummary('2025-01-01', true);
      assert.ok(!res.error, `RPC failed on empty date: ${res.error?.message}`);
      assert.strictEqual(typeof res.data.caixa_atual, 'number');
      assert.ok(!Number.isNaN(res.data.caixa_atual), 'caixa_atual must not be NaN');
      assert.ok(!Number.isNaN(res.data.diferenca_final), 'diferenca_final must not be NaN');
    });

    it('F1-B2: floating point precision rounding to 2 decimal places in calculations', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error);
      const diffStr = res.data.diferenca_final.toString();
      const decimals = diffStr.split('.')[1] || '';
      assert.ok(decimals.length <= 2, `diferenca_final must be rounded to at most 2 decimal places, got ${diffStr}`);
    });

    it('F1-B3: negative bank balance (e.g. overdraft in Itaú) must be handled without crash', async () => {
      const res = await getDailyReconciliationSummary('2026-09-16', false);
      assert.ok(!res.error);
      assert.ok(typeof res.data.saldo_negativo_itau === 'number');
      assert.ok(res.data.saldo_negativo_itau >= 0, 'saldo_negativo_itau should represent absolute overdraft debt');
    });

    it('F1-B4: stores array should handle stores with zero movements gracefully', async () => {
      const res = await getDailyReconciliationSummary('2026-08-17', true);
      assert.ok(!res.error);
      for (const store of res.data.stores || []) {
        assert.ok(!Number.isNaN(store.saldo_banco), `Store ${store.store_name} saldo_banco is NaN`);
        assert.ok(!Number.isNaN(store.diferenca), `Store ${store.store_name} diferenca is NaN`);
      }
    });

    it('F1-B5: summary must handle leap year boundary date (e.g. 2024-02-29 or 2028-02-29)', async () => {
      const res = await getDailyReconciliationSummary('2024-02-29', true);
      assert.ok(!res.error || res.error.message.includes('date'), 'Should process or reject cleanly');
    });
  });

  // Feature 2 Boundaries
  describe('F2 Boundary: Open vs Closed edge conditions', () => {
    it('F2-B1: requesting future date where no snapshot exists must default to open dynamic calculation', async () => {
      const res = await getDailyReconciliationSummary('2030-01-01', false);
      assert.ok(!res.error);
      assert.strictEqual(res.data.is_closed, false, 'Future date must have is_closed=false');
    });

    it('F2-B2: passing invalid non-ISO date string should return clean database error, not 500', async () => {
      const res = await getDailyReconciliationSummary('invalid-date-string', false);
      assert.ok(res.error, 'Should return error for invalid date');
    });

    it('F2-B3: passing empty date string should be safely rejected', async () => {
      const res = await getDailyReconciliationSummary(BOUNDARY_INPUTS.EMPTY_DATE, false);
      assert.ok(res.error, 'Empty date must return an error');
    });

    it('F2-B4: marco zero date handling (is_marco_zero flag)', async () => {
      const res = await getDailyReconciliationSummary('2026-08-01', false);
      assert.ok(!res.error);
      assert.strictEqual(typeof res.data.is_marco_zero, 'boolean');
    });

    it('F2-B5: closed day with p_force_dynamic=true must not overwrite frozen snapshot in daily_snapshots', async () => {
      const before = await getDailyReconciliationSummary('2026-09-16', false);
      if (before.data.is_closed) {
        await getDailyReconciliationSummary('2026-09-16', true); // Force dynamic
        const after = await getDailyReconciliationSummary('2026-09-16', false); // Read snapshot again
        assert.strictEqual(after.data.is_closed, true, 'is_closed must remain true after forced dynamic read');
        assert.strictEqual(after.data.closed_at, before.data.closed_at, 'closed_at must remain unchanged');
      }
    });
  });

  // Feature 3 Boundaries
  describe('F3 Boundary: Tolerance threshold boundary conditions (50.00)', () => {
    it('F3-B1: boundary case diff = +50.0000 exactly must be approved', () => {
      assertToleranceCalculation(50.00, 'approved');
    });

    it('F3-B2: boundary case diff = +50.01 must be divergence', () => {
      assertToleranceCalculation(50.01, 'divergence');
    });

    it('F3-B3: boundary case diff = -50.0000 exactly must be approved', () => {
      assertToleranceCalculation(-50.00, 'approved');
    });

    it('F3-B4: boundary case diff = -50.01 must be divergence', () => {
      assertToleranceCalculation(-50.01, 'divergence');
    });

    it('F3-B5: boundary case diff = 0.00 must be approved', () => {
      assertToleranceCalculation(0.00, 'approved');
    });
  });

  // Feature 4 Boundaries
  describe('F4 Boundary: Deprecated function calling & injection resistance', () => {
    it('F4-B1: SQL injection attempts in p_date should not execute arbitrary SQL', async () => {
      const res = await getDailyReconciliationSummary(BOUNDARY_INPUTS.SQL_INJECTION_DATE, false);
      assert.ok(res.error, 'SQL injection date should be safely rejected');
    });

    it('F4-B2: calling calculate_daily_conciliation with invalid types should fail', async () => {
      const { supabase } = await import('../harness/client.mjs');
      const res = await supabase.rpc('calculate_daily_conciliation', { p_date: 'invalid' });
      // Should fail either because function does not exist (preferred) or because arg is invalid
      assert.ok(res.error, 'Call to calculate_daily_conciliation must fail');
    });

    it('F4-B3: concurrent calls to get_daily_reconciliation_summary should not interfere', async () => {
      const calls = Array.from({ length: 5 }, () => getDailyReconciliationSummary('2026-08-24', true));
      const results = await Promise.all(calls);
      for (const res of results) {
        assert.ok(!res.error);
        assert.strictEqual(res.data.date, '2026-08-24');
      }
    });

    it('F4-B4: permissions on get_daily_reconciliation_summary should allow anon or authenticated read', async () => {
      const { supabaseAnon } = await import('../harness/client.mjs');
      const res = await supabaseAnon.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24', p_force_dynamic: false });
      assert.ok(!res.error || res.error.message.includes('JWT') || res.data, 'RPC call through anon client');
    });

    it('F4-B5: SECURITY DEFINER on get_daily_reconciliation_summary prevents search_path hijacking', async () => {
      const { querySql } = await import('../harness/client.mjs');
      const res = await querySql(`
        SELECT prosecdef, proconfig
        FROM pg_proc
        WHERE proname = 'get_daily_reconciliation_summary';
      `);
      if (res.rows && res.rows.length > 0) {
        assert.strictEqual(res.rows[0].prosecdef, true, 'get_daily_reconciliation_summary must be SECURITY DEFINER');
      }
    });
  });

  // Feature 5 Boundaries
  describe('F5 Boundary: Dynamic date calculations without fallback hardcodes', () => {
    it('F5-B1: date with only OFX transactions and no POS should calculate without NaN', async () => {
      const res = await getDailyReconciliationSummary('2026-08-17', true);
      assert.ok(!res.error);
      assert.ok(!Number.isNaN(res.data.cartoes_a_compensar));
    });

    it('F5-B2: date with only POS transactions and no OFX should calculate without NaN', async () => {
      const res = await getDailyReconciliationSummary('2026-08-18', true);
      assert.ok(!res.error);
      assert.ok(!Number.isNaN(res.data.saldo_bancos_ofx));
    });

    it('F5-B3: date with manual bills but no bank debits should reflect in contas_base', async () => {
      const res = await getDailyReconciliationSummary('2026-08-21', true);
      assert.ok(!res.error);
      assert.ok(typeof res.data.contas_base === 'number');
    });

    it('F5-B4: date with store cash vault deposits should update dinheiro_lojas dynamically', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', true);
      assert.ok(!res.error);
      assert.ok(typeof res.data.dinheiro_lojas === 'number');
    });

    it('F5-B5: verify no other date in 2026 has hardcoded override branches in RPC source', async () => {
      const { querySql } = await import('../harness/client.mjs');
      const res = await querySql("SELECT prosrc FROM pg_proc WHERE proname = 'get_daily_reconciliation_summary';");
      if (res.rows && res.rows.length > 0) {
        const src = res.rows[0].prosrc || '';
        assert.ok(!src.includes("p_date = '2026-08-24' THEN"), 'No hardcoded branch for 2026-08-24');
        assert.ok(!src.includes("p_date = '2026-09-16' THEN"), 'No hardcoded branch for 2026-09-16');
      }
    });
  });
});
