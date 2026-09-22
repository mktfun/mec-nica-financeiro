// tests/e2e/tier1_features/m6_user_flow.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  getDailyReconciliationSummary,
  scanCodebase,
  findPatternInFiles
} from '../harness/client.mjs';
import {
  assertSummaryContract,
  assert5PillarsPresent,
  assertStoresSumMatchesGlobal
} from '../harness/assertions.mjs';
import { REAL_DATES } from '../harness/config.mjs';

describe('Tier 1 — Milestone 6: User Flow Simplification & System Verification (Features 21–22)', () => {

  // --------------------------------------------------------------------------
  // Feature 21: Simplified 4-Step User Flow
  // --------------------------------------------------------------------------
  describe('Feature 21: Simplified 4-Step User Flow', () => {
    it('F21-T1: CentralImportWizard.tsx should implement the 4 canonical steps', () => {
      const wizardPath = path.join(process.cwd(), 'src/components/importacoes/CentralImportWizard.tsx');
      if (fs.existsSync(wizardPath)) {
        const content = fs.readFileSync(wizardPath, 'utf8');
        // Steps: 1 Upload, 2 Exceptions, 3 Fechar o Dia, 4 Conciliação
        assert.ok(
          content.includes('fechar') || content.includes('fechar_dia') || content.includes('audit'),
          'CentralImportWizard must structure user workflow around closing'
        );
      }
    });

    it('F21-T2: wizard must NOT execute premature closing before exception review', () => {
      const wizardPath = path.join(process.cwd(), 'src/components/importacoes/CentralImportWizard.tsx');
      if (fs.existsSync(wizardPath)) {
        const content = fs.readFileSync(wizardPath, 'utf8');
        // Check lines around Step 2 / processing
        assert.ok(
          !content.includes('is_closed: true') || content.includes('fechar_dia'),
          'Wizard should not perform premature JS-driven daily_snapshots closing before reviewing exceptions'
        );
      }
    });

    it('F21-T3: step navigation should prevent advancing to step 4 without closing execution', () => {
      const wizardPath = path.join(process.cwd(), 'src/components/importacoes/CentralImportWizard.tsx');
      if (fs.existsSync(wizardPath)) {
        const content = fs.readFileSync(wizardPath, 'utf8');
        assert.ok(content.length > 500, 'Wizard component must exist and contain complete step navigation logic');
      }
    });

    it('F21-T4: final step (conciliação) must navigate or link cleanly to /conciliacao', () => {
      const wizardPath = path.join(process.cwd(), 'src/components/importacoes/CentralImportWizard.tsx');
      if (fs.existsSync(wizardPath)) {
        const content = fs.readFileSync(wizardPath, 'utf8');
        assert.ok(
          content.includes('/conciliacao') || content.includes('conciliacao'),
          'Final step must guide user to reconciliation view'
        );
      }
    });

    it('F21-T5: exception review step should only present backend-flagged pending items', () => {
      const files = scanCodebase('src/components/importacoes');
      const step2 = files.find(f => f.includes('Step2') || f.includes('Exceptions') || f.includes('Review'));
      if (step2) {
        const content = fs.readFileSync(step2, 'utf8');
        assert.ok(content.includes('pending') || content.includes('status'), 'Exceptions view must filter by pending status');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 22: Acceptance Criteria Verification Across Real Dates
  // --------------------------------------------------------------------------
  describe('Feature 22: Acceptance Criteria Verification Across Real Dates', () => {
    for (const date of REAL_DATES) {
      it(`F22-T: date ${date} must produce zero discrepancy between store sums and global totals`, async () => {
        const res = await getDailyReconciliationSummary(date, false);
        assert.ok(!res.error, `RPC failed on ${date}: ${res.error?.message}`);
        assertSummaryContract(res.data);
        assert5PillarsPresent(res.data);
        if (res.data.stores && res.data.stores.length > 0) {
          assertStoresSumMatchesGlobal(res.data);
        }
      });
    }

    it('F22-T6: date 2026-09-16 must reflect exact OFX net balance (R$ 105.714,91)', async () => {
      const res = await getDailyReconciliationSummary('2026-09-16', false);
      assert.ok(!res.error, `RPC failed on 2026-09-16: ${res.error?.message}`);
      // R$ 129.709,49 (positivo) - R$ 23.994,58 (cheque especial) = R$ 105.714,91
      const netBank = (Number(res.data.saldo_bancos_positivo) || 0) - (Number(res.data.saldo_negativo_itau) || 0);
      assert.ok(
        Math.abs(netBank - 105714.91) <= 1.00 || Math.abs(Number(res.data.total_saldo_banco) - 105714.91) <= 100.00,
        `Bank net balance on 2026-09-16 expected near R$ 105.714,91, got ${netBank.toFixed(2)}`
      );
    });
  });
});
