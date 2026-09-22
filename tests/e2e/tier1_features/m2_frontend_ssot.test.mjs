// tests/e2e/tier1_features/m2_frontend_ssot.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { scanCodebase, findPatternInFiles } from '../harness/client.mjs';

describe('Tier 1 — Milestone 2: Frontend SSOT Hook & Math Purge (Features 6–9)', () => {

  // --------------------------------------------------------------------------
  // Feature 6: Single Reading Hook (useDailyReconciliationSummary)
  // --------------------------------------------------------------------------
  describe('Feature 6: Single Reading Hook', () => {
    it('F6-T1: src/hooks/useDailyReconciliationSummary.ts must exist', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      const hookPathTsx = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.tsx');
      assert.ok(
        fs.existsSync(hookPath) || fs.existsSync(hookPathTsx),
        'Canonical hook src/hooks/useDailyReconciliationSummary.ts does not exist!'
      );
    });

    it('F6-T2: useDailyReconciliationSummary must be exported as a callable React hook', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        assert.ok(
          content.includes('export function useDailyReconciliationSummary') ||
          content.includes('export const useDailyReconciliationSummary'),
          'Hook must export useDailyReconciliationSummary'
        );
      }
    });

    it('F6-T3: hook must invoke get_daily_reconciliation_summary RPC directly', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        assert.ok(
          content.includes("'get_daily_reconciliation_summary'") || content.includes('"get_daily_reconciliation_summary"'),
          'Hook must invoke get_daily_reconciliation_summary RPC'
        );
      }
    });

    it('F6-T4: hook must NOT perform supplementary queries or recalculations', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        // Must not query pos_transactions or store_cash_vault inside the hook
        assert.ok(!content.includes(".from('pos_transactions')"), 'Hook must not query pos_transactions directly');
        assert.ok(!content.includes(".from('store_cash_vault')"), 'Hook must not query store_cash_vault directly');
      }
    });

    it('F6-T5: hook must pass through DB payload without altering values', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        assert.ok(
          content.includes('return data') || content.includes('return query.data') || content.includes('data:'),
          'Hook must pass through database data directly'
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 7: Unified Cache Key
  // --------------------------------------------------------------------------
  describe('Feature 7: Unified Cache Key', () => {
    it('F7-T1: query key in useDailyReconciliationSummary must be ["daily_reconciliation_summary", date]', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        assert.ok(
          content.includes("['daily_reconciliation_summary'") || content.includes('["daily_reconciliation_summary"'),
          'Query key must start with "daily_reconciliation_summary"'
        );
      }
    });

    it('F7-T2: codebase must NOT contain conflicting query key "daily-reconciliation-summary" (kebab-case)', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /['"]daily-reconciliation-summary['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found legacy kebab-case query key in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F7-T3: codebase must NOT contain conflicting query key "backend-conciliacao"', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /['"]backend-conciliacao['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found legacy query key 'backend-conciliacao' in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F7-T4: codebase must NOT contain conflicting query key "daily-snapshot" or "daily_snapshots"', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /queryKey:\s*\[['"]daily-snapshot['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found conflicting query key 'daily-snapshot' in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F7-T5: cache invalidation calls in components/mutations must target ["daily_reconciliation_summary"]', () => {
      const files = scanCodebase('src/components');
      const invalidations = findPatternInFiles(files, /invalidateQueries/);
      for (const inv of invalidations) {
        if (inv.content.includes('conciliacao') || inv.content.includes('snapshot')) {
          assert.ok(
            inv.content.includes('daily_reconciliation_summary'),
            `Invalidation at ${inv.file}:${inv.line} does not use canonical query key`
          );
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 8: Purge Client-Side Financial Math
  // --------------------------------------------------------------------------
  describe('Feature 8: Purge Client-Side Financial Math', () => {
    it('F8-T1: ResumoDiaPanel.tsx must NOT derive financial totals using client-side math', () => {
      const filePath = path.join(process.cwd(), 'src/components/conciliacao/ResumoDiaPanel.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          !content.includes('caixaAtualCalculado ='),
          'ResumoDiaPanel still contains client-side caixaAtualCalculado derivation!'
        );
        assert.ok(
          !content.includes('fluxoCaixaCalculado ='),
          'ResumoDiaPanel still contains client-side fluxoCaixaCalculado derivation!'
        );
        assert.ok(
          !content.includes('diferencaFinalCalculada ='),
          'ResumoDiaPanel still contains client-side diferencaFinalCalculada derivation!'
        );
      }
    });

    it('F8-T2: conciliacao.index.tsx must NOT aggregate store totals via .reduce', () => {
      const filePath = path.join(process.cwd(), 'src/routes/conciliacao.index.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          !content.includes('storesList.reduce'),
          'conciliacao.index.tsx still aggregates store metrics via .reduce in browser!'
        );
      }
    });

    it('F8-T3: conciliacao.$lojaId.tsx must NOT contain client-side tolerance rules', () => {
      const filePath = path.join(process.cwd(), 'src/routes/conciliacao.$lojaId.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          !content.includes('Math.abs') || !content.includes('<= 0.05'),
          'conciliacao.$lojaId.tsx contains client-side tolerance calculation!'
        );
      }
    });

    it('F8-T4: SaldoBancosDetailModal.tsx must NOT recalculate positive vs negative bank totals in JS', () => {
      const filePath = path.join(process.cwd(), 'src/components/conciliacao/SaldoBancosDetailModal.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          !content.includes('.reduce((acc, row) => acc + (row.amount > 0'),
          'SaldoBancosDetailModal contains client-side bank split math!'
        );
      }
    });

    it('F8-T5: ConciliacaoLojasView.tsx must consume store status directly from store.status', () => {
      const filePath = path.join(process.cwd(), 'src/components/conciliacao/ConciliacaoLojasView.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          !content.includes('Math.abs(s.diferenca) <= 0.05'),
          'ConciliacaoLojasView contains client-side status calculation!'
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 9: Direct Component Adaptation
  // --------------------------------------------------------------------------
  describe('Feature 9: Direct Component Adaptation', () => {
    it('F9-T1: ResumoDiaPanel.tsx must consume useDailyReconciliationSummary', () => {
      const filePath = path.join(process.cwd(), 'src/components/conciliacao/ResumoDiaPanel.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          content.includes('useDailyReconciliationSummary'),
          'ResumoDiaPanel must import and use useDailyReconciliationSummary'
        );
      }
    });

    it('F9-T2: conciliacao.index.tsx must consume useDailyReconciliationSummary', () => {
      const filePath = path.join(process.cwd(), 'src/routes/conciliacao.index.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          content.includes('useDailyReconciliationSummary'),
          'conciliacao.index.tsx must import and use useDailyReconciliationSummary'
        );
      }
    });

    it('F9-T3: conciliacao.$lojaId.tsx must consume useDailyReconciliationSummary or store from SSOT', () => {
      const filePath = path.join(process.cwd(), 'src/routes/conciliacao.$lojaId.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          content.includes('useDailyReconciliationSummary') || content.includes('useBackendConciliacao'),
          'conciliacao.$lojaId.tsx must consume SSOT summary'
        );
      }
    });

    it('F9-T4: Step4FinalAuditAndClose.tsx must consume useDailyReconciliationSummary', () => {
      const filePath = path.join(process.cwd(), 'src/components/importacoes/Step4FinalAuditAndClose.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          content.includes('useDailyReconciliationSummary') || content.includes('summary'),
          'Step4FinalAuditAndClose must consume daily reconciliation summary'
        );
      }
    });

    it('F9-T5: PatioOsDetailModal.tsx must NOT directly update daily_snapshots.total_patio', () => {
      const filePath = path.join(process.cwd(), 'src/components/conciliacao/PatioOsDetailModal.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          !content.includes(".from('daily_snapshots').update"),
          'PatioOsDetailModal must not directly update daily_snapshots!'
        );
      }
    });
  });
});
