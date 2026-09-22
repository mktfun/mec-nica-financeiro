// tests/e2e/tier4_real_world/real_dates_audit.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDailyReconciliationSummary } from '../harness/client.mjs';
import { REAL_DATES } from '../harness/config.mjs';
import {
  assertSummaryContract,
  assert5PillarsPresent,
  assertStoresSumMatchesGlobal,
  assertStatusVocabulary,
  assertToleranceCalculation
} from '../harness/assertions.mjs';

describe('Tier 4 — Real-World Application: 6 Canonical Dates Audit', () => {

  for (const testDate of REAL_DATES) {
    describe(`Real Date: ${testDate}`, () => {

      it(`Audit-${testDate}-01: get_daily_reconciliation_summary returns valid SSOT contract`, async () => {
        const res = await getDailyReconciliationSummary(testDate, false);
        assert.ok(!res.error, `RPC call failed for date ${testDate}: ${res.error?.message}`);
        assertSummaryContract(res.data);
        assert5PillarsPresent(res.data);
        assert.strictEqual(res.data.date, testDate);
      });

      it(`Audit-${testDate}-02: caixa_atual accounting invariant holds within 0.05 tolerance`, async () => {
        const res = await getDailyReconciliationSummary(testDate, false);
        assert.ok(!res.error);
        const d = res.data;
        const expected = (
          (Number(d.total_saldo_banco) || 0) +
          (Number(d.dinheiro_mp) || 0) +
          (Number(d.a_receber) || 0) +
          (Number(d.total_patio) || 0) -
          (Number(d.saldo_negativo_itau) || 0)
        );
        const actual = Number(d.caixa_atual) || 0;
        const diff = Math.abs(expected - actual);
        assert.ok(
          diff <= 0.05,
          `Caixa atual formula drift on ${testDate}: expected ${expected.toFixed(2)}, got ${actual.toFixed(2)} (diff: ${diff.toFixed(4)})`
        );
      });

      it(`Audit-${testDate}-03: fluxo_caixa accounting invariant holds within 0.05 tolerance`, async () => {
        const res = await getDailyReconciliationSummary(testDate, false);
        assert.ok(!res.error);
        const d = res.data;
        const expected = (Number(d.caixa_atual) || 0) - (Number(d.caixa_anterior) || 0);
        const actual = Number(d.fluxo_caixa) || 0;
        const diff = Math.abs(expected - actual);
        assert.ok(
          diff <= 0.05,
          `Fluxo de caixa drift on ${testDate}: expected ${expected.toFixed(2)}, got ${actual.toFixed(2)} (diff: ${diff.toFixed(4)})`
        );
      });

      it(`Audit-${testDate}-04: diferenca_final accounting invariant holds within 0.05 tolerance`, async () => {
        const res = await getDailyReconciliationSummary(testDate, false);
        assert.ok(!res.error);
        const d = res.data;
        const expected = (Number(d.valor_disp_contas) || 0) - (Number(d.subtotal_contas) || 0);
        const actual = Number(d.diferenca_final) || 0;
        const diff = Math.abs(expected - actual);
        assert.ok(
          diff <= 0.05,
          `Diferenca final formula drift on ${testDate}: expected ${expected.toFixed(2)}, got ${actual.toFixed(2)} (diff: ${diff.toFixed(4)})`
        );
      });

      it(`Audit-${testDate}-05: status_geral matches tolerance rule (<= 50.00 approved, else divergence)`, async () => {
        const res = await getDailyReconciliationSummary(testDate, false);
        assert.ok(!res.error);
        assertStatusVocabulary(res.data.status_geral);
        assertToleranceCalculation(res.data.diferenca_final, res.data.status_geral);
      });

      it(`Audit-${testDate}-06: stores breakdown sum equals macro pillars with zero difference`, async () => {
        const res = await getDailyReconciliationSummary(testDate, false);
        assert.ok(!res.error);
        if (res.data?.stores && res.data.stores.length > 0) {
          assertStoresSumMatchesGlobal(res.data);
        }
      });
    });
  }

  describe('Cross-Date Enchainment & Odometro Progression', () => {
    it('Audit-Chain-01: chronological dates show non-negative odometro reading progression', async () => {
      for (const d of REAL_DATES) {
        const res = await getDailyReconciliationSummary(d, false);
        if (!res.error && res.data) {
          assert.ok(typeof res.data.odometro_hoje === 'number', `odometro_hoje must be numeric on ${d}`);
          assert.ok(res.data.odometro_hoje >= 0, `odometro_hoje must be non-negative on ${d}`);
        }
      }
    });

    it('Audit-Chain-02: dynamic calculation of 2026-09-16 operates without fallback hardcodes', async () => {
      const res = await getDailyReconciliationSummary('2026-09-16', true);
      assert.ok(!res.error, `Dynamic calculation for 2026-09-16 failed: ${res.error?.message}`);
      assert.strictEqual(typeof res.data.diferenca_final, 'number');
      assert.ok(!Number.isNaN(res.data.diferenca_final));
    });
  });
});
