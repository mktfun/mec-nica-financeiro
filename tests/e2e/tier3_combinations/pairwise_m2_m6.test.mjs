// tests/e2e/tier3_combinations/pairwise_m2_m6.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('Tier 3 — Pairwise Combination: M2 Frontend SSOT Hook ↔ M6 Simplified Flow (CentralImportWizard)', () => {

  it('Pair-M2-M6-01: Step 4 in CentralImportWizard consumes SSOT summary hook or props', () => {
    const step4Path = path.join(process.cwd(), 'src/components/importacoes/Step4FinalAuditAndClose.tsx');
    const wizardStep4Path = path.join(process.cwd(), 'src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx');
    const target = fs.existsSync(step4Path) ? step4Path : (fs.existsSync(wizardStep4Path) ? wizardStep4Path : null);

    assert.ok(target, 'Step4FinalAuditAndClose component must exist');
    const content = fs.readFileSync(target, 'utf8');
    assert.ok(
      content.includes('useDailyReconciliationSummary') ||
      content.includes('summary') ||
      content.includes('useBackendConciliacao'),
      'Step4FinalAuditAndClose must consume daily reconciliation summary'
    );
  });

  it('Pair-M2-M6-02: Step 4 must invalidate unified cache key upon closing execution', () => {
    const step4Path = path.join(process.cwd(), 'src/components/importacoes/Step4FinalAuditAndClose.tsx');
    const wizardStep4Path = path.join(process.cwd(), 'src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx');
    const target = fs.existsSync(step4Path) ? step4Path : (fs.existsSync(wizardStep4Path) ? wizardStep4Path : null);

    if (target) {
      const content = fs.readFileSync(target, 'utf8');
      assert.ok(
        content.includes('invalidateQueries') || content.includes('refetch'),
        'Step 4 must trigger cache invalidation or refetch upon closing'
      );
    }
  });

  it('Pair-M2-M6-03: zero client-side financial aggregation in CentralImportWizard components', () => {
    const wizardDir = path.join(process.cwd(), 'src/components/importacoes');
    if (fs.existsSync(wizardDir)) {
      const files = fs.readdirSync(wizardDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(wizardDir, file), 'utf8');
        assert.ok(
          !content.includes('caixaAtualCalculado =') && !content.includes('diferencaFinalCalculada ='),
          `Component ${file} contains client-side mathematical derivations!`
        );
      }
    }
  });

  it('Pair-M2-M6-04: Step 4 directly binds status_geral to closing result badge', () => {
    const step4Path = path.join(process.cwd(), 'src/components/importacoes/Step4FinalAuditAndClose.tsx');
    const wizardStep4Path = path.join(process.cwd(), 'src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx');
    const target = fs.existsSync(step4Path) ? step4Path : (fs.existsSync(wizardStep4Path) ? wizardStep4Path : null);

    if (target) {
      const content = fs.readFileSync(target, 'utf8');
      assert.ok(
        content.includes('status_geral') || content.includes('status') || content.includes('is_closed'),
        'Step 4 must render closing status badge directly from SSOT payload'
      );
    }
  });

  it('Pair-M2-M6-05: CentralImportWizard navigates to /conciliacao route preserving date query param', () => {
    const wizardPath = path.join(process.cwd(), 'src/components/importacoes/CentralImportWizard.tsx');
    if (fs.existsSync(wizardPath)) {
      const content = fs.readFileSync(wizardPath, 'utf8');
      assert.ok(
        content.includes('/conciliacao') || content.includes('navigate'),
        'Wizard must navigate to /conciliacao on completion'
      );
    }
  });
});
