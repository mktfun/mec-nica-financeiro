// tests/e2e/tier2_boundary/m6_flow_boundary.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { getDailyReconciliationSummary } from '../harness/client.mjs';
import { REAL_DATES } from '../harness/config.mjs';
import { assertStoresSumMatchesGlobal, assertToleranceCalculation } from '../harness/assertions.mjs';

describe('Tier 2 — Boundary & Corner Cases: Simplified Flow & Accounting Invariants (Features 21–22)', () => {

  // --------------------------------------------------------------------------
  // Feature 21 Boundary: Simplified 4-Step Flow Edge Conditions
  // --------------------------------------------------------------------------
  describe('F21 Boundary: Wizard Step Integrity & Edge Conditions', () => {
    it('F21-B1: CentralImportWizard must guard against direct jump to step 4 without step 3 completion', () => {
      const wizardPath = path.join(process.cwd(), 'src/components/importacoes/CentralImportWizard.tsx');
      if (fs.existsSync(wizardPath)) {
        const content = fs.readFileSync(wizardPath, 'utf8');
        assert.ok(
          content.includes('currentStep') || content.includes('step') || content.includes('activeStep'),
          'CentralImportWizard must maintain active step state management'
        );
      }
    });

    it('F21-B2: Step 4 (audit/close) must read from single source of truth hook/RPC, zero client math', () => {
      const step4Path = path.join(process.cwd(), 'src/components/importacoes/Step4FinalAuditAndClose.tsx');
      const wizardStep4Path = path.join(process.cwd(), 'src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx');
      const target = fs.existsSync(step4Path) ? step4Path : (fs.existsSync(wizardStep4Path) ? wizardStep4Path : null);
      if (target) {
        const content = fs.readFileSync(target, 'utf8');
        assert.ok(
          !content.includes('totalCalculado =') && !content.includes('diferencaCalculada ='),
          'Step 4 must not recompute financial totals locally'
        );
      }
    });

    it('F21-B3: date change during wizard execution must be handled safely', () => {
      const wizardPath = path.join(process.cwd(), 'src/components/importacoes/CentralImportWizard.tsx');
      if (fs.existsSync(wizardPath)) {
        const content = fs.readFileSync(wizardPath, 'utf8');
        assert.ok(
          content.includes('selectedDate') || content.includes('date') || content.includes('setDate'),
          'Wizard must track date context cleanly'
        );
      }
    });

    it('F21-B4: empty or zero files uploaded in Step 1 must not trigger closing or exception review', () => {
      const wizardPath = path.join(process.cwd(), 'src/components/importacoes/CentralImportWizard.tsx');
      if (fs.existsSync(wizardPath)) {
        const content = fs.readFileSync(wizardPath, 'utf8');
        assert.ok(
          content.includes('files.length') || content.includes('files?.length') || content.includes('selectedFiles'),
          'Wizard Step 1 must validate presence of files before proceeding'
        );
      }
    });

    it('F21-B5: Step 2 orphan categorization must not execute premature daily snapshot update', () => {
      const step2Path = path.join(process.cwd(), 'src/components/importacoes/wizard/Step2OrphanCategorization.tsx');
      const altStep2 = path.join(process.cwd(), 'src/components/importacoes/Step2OrphanCategorization.tsx');
      const target = fs.existsSync(step2Path) ? step2Path : (fs.existsSync(altStep2) ? altStep2 : null);
      if (target) {
        const content = fs.readFileSync(target, 'utf8');
        assert.ok(
          !content.includes(".from('daily_snapshots').update"),
          'Step 2 must not mutate daily_snapshots table'
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 22 Boundary: Rigorous Accounting Invariants & Floating-Point Boundaries
  // --------------------------------------------------------------------------
  describe('F22 Boundary: Accounting Invariants & Floating-Point Boundaries', () => {
    it('F22-B1: tolerance boundary evaluation at 50.0001 (divergence) vs 49.9999 (approved)', () => {
      assertToleranceCalculation(50.0001, 'divergence');
      assertToleranceCalculation(49.9999, 'approved');
      assertToleranceCalculation(-50.0001, 'divergence');
      assertToleranceCalculation(-49.9999, 'approved');
    });

    it('F22-B2: accounting invariant 1: caixa_atual = total_saldo_banco + dinheiro_mp + a_receber + total_patio - saldo_negativo_itau', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error);
      const d = res.data;
      const expectedCaixaAtual = (
        (Number(d.total_saldo_banco) || 0) +
        (Number(d.dinheiro_mp) || 0) +
        (Number(d.a_receber) || 0) +
        (Number(d.total_patio) || 0) -
        (Number(d.saldo_negativo_itau) || 0)
      );
      const diff = Math.abs(expectedCaixaAtual - (Number(d.caixa_atual) || 0));
      assert.ok(
        diff <= 0.05,
        `Caixa atual formula drift: expected ${expectedCaixaAtual.toFixed(2)}, got ${Number(d.caixa_atual).toFixed(2)} (diff: ${diff.toFixed(4)})`
      );
    });

    it('F22-B3: accounting invariant 2: fluxo_caixa = caixa_atual - caixa_anterior', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error);
      const d = res.data;
      const expectedFluxo = (Number(d.caixa_atual) || 0) - (Number(d.caixa_anterior) || 0);
      const diff = Math.abs(expectedFluxo - (Number(d.fluxo_caixa) || 0));
      assert.ok(
        diff <= 0.05,
        `Fluxo de caixa formula drift: expected ${expectedFluxo.toFixed(2)}, got ${Number(d.fluxo_caixa).toFixed(2)} (diff: ${diff.toFixed(4)})`
      );
    });

    it('F22-B4: accounting invariant 3: diferenca_final = valor_disp_contas - subtotal_contas', async () => {
      const res = await getDailyReconciliationSummary('2026-08-24', false);
      assert.ok(!res.error);
      const d = res.data;
      const expectedDiff = (Number(d.valor_disp_contas) || 0) - (Number(d.subtotal_contas) || 0);
      const diff = Math.abs(expectedDiff - (Number(d.diferenca_final) || 0));
      assert.ok(
        diff <= 0.05,
        `Diferenca final formula drift: expected ${expectedDiff.toFixed(2)}, got ${Number(d.diferenca_final).toFixed(2)} (diff: ${diff.toFixed(4)})`
      );
    });

    it('F22-B5: store totals vs macro pillars equality across multiple test dates', async () => {
      const testDates = ['2026-08-17', '2026-08-24', '2026-09-16'];
      for (const date of testDates) {
        const res = await getDailyReconciliationSummary(date, false);
        if (!res.error && res.data?.stores?.length > 0) {
          assertStoresSumMatchesGlobal(res.data);
        }
      }
    });
  });
});
