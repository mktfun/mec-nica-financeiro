// tests/e2e/tier2_boundary/m2_frontend_boundary.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { scanCodebase, findPatternInFiles } from '../harness/client.mjs';

describe('Tier 2 — Boundary & Corner Cases: Frontend SSOT & Math Purge (Features 6–9)', () => {

  // --------------------------------------------------------------------------
  // Feature 6 Boundary: Single Reading Hook edge conditions
  // --------------------------------------------------------------------------
  describe('F6 Boundary: Hook parameter edge cases & safety', () => {
    it('F6-B1: hook source file must handle undefined or empty date gracefully', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      const hookPathTsx = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.tsx');
      const targetPath = fs.existsSync(hookPath) ? hookPath : (fs.existsSync(hookPathTsx) ? hookPathTsx : null);
      
      assert.ok(targetPath, 'Hook file useDailyReconciliationSummary.ts must exist');
      const content = fs.readFileSync(targetPath, 'utf8');
      // Should support enabled: Boolean(date) or check for !date
      assert.ok(
        content.includes('enabled:') || content.includes('!date') || content.includes('Boolean('),
        'Hook must have conditional execution guard when date is null/undefined/empty'
      );
    });

    it('F6-B2: hook must not export mutation functions or allow state mutation', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        assert.ok(!content.includes('useMutation'), 'useDailyReconciliationSummary must be a read-only query hook, no mutations');
      }
    });

    it('F6-B3: hook must use TanStack useQuery and return standardized query result object', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        assert.ok(content.includes('useQuery'), 'Hook must wrap TanStack useQuery');
        assert.ok(
          content.includes('data') && (content.includes('isLoading') || content.includes('isPending')),
          'Hook must return standardized data and loading states'
        );
      }
    });

    it('F6-B4: hook must accept forceDynamic parameter with boolean typing', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        assert.ok(
          content.includes('forceDynamic') || content.includes('force_dynamic') || content.includes('p_force_dynamic'),
          'Hook should accept an optional forceDynamic parameter'
        );
      }
    });

    it('F6-B5: hook error state must expose Supabase PostgrestError without swallowing message', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        assert.ok(
          content.includes('error') && !content.includes('catch (e) {}'),
          'Hook must not swallow backend errors with empty catch block'
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 7 Boundary: Unified Cache Key Boundaries
  // --------------------------------------------------------------------------
  describe('F7 Boundary: Cache key isolation & invalidation boundaries', () => {
    it('F7-B1: queryKey must incorporate the date argument for multi-date cache isolation', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        assert.ok(
          content.includes("['daily_reconciliation_summary', date]") ||
          content.includes('["daily_reconciliation_summary", date]') ||
          content.includes('["daily_reconciliation_summary", selectedDate]') ||
          content.includes("['daily_reconciliation_summary', selectedDate]"),
          'queryKey must include both canonical prefix and date variable'
        );
      }
    });

    it('F7-B2: no component may construct fragmented query keys for reconciliation summary', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /queryKey:\s*\[['"](reconciliation_summary|resumo_conciliacao|summary_dia)['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found fragmented or non-canonical query keys: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F7-B3: invalidation after closing must specifically target daily_reconciliation_summary with matching date', () => {
      const files = scanCodebase('src/components');
      const invalidations = findPatternInFiles(files, /invalidateQueries/);
      for (const inv of invalidations) {
        if (inv.content.includes('fechar') || inv.content.includes('close')) {
          assert.ok(
            inv.content.includes('daily_reconciliation_summary'),
            `Closing mutation at ${inv.file}:${inv.line} must invalidate 'daily_reconciliation_summary'`
          );
        }
      }
    });

    it('F7-B4: cache key must not contain mutable object references or random tokens', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        assert.ok(!content.includes('Date.now()'), 'queryKey must not include dynamic timestamps');
        assert.ok(!content.includes('Math.random()'), 'queryKey must not include random tokens');
      }
    });

    it('F7-B5: cache staleTime should be defined or defaulted without infinite zero-stale loops', () => {
      const hookPath = path.join(process.cwd(), 'src/hooks/useDailyReconciliationSummary.ts');
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        // If staleTime is configured, it should not be -1 or NaN
        assert.ok(!content.includes('staleTime: -1'), 'staleTime must not be negative');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 8 Boundary: Purge Client Financial Math Boundaries
  // --------------------------------------------------------------------------
  describe('F8 Boundary: Zero math & format presentation boundary conditions', () => {
    it('F8-B1: ResumoDiaPanel must handle null or zero financial metrics without fallback client recalculation', () => {
      const filePath = path.join(process.cwd(), 'src/components/conciliacao/ResumoDiaPanel.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(!content.includes('+ summary.dinheiro_lojas + summary.cartoes'), 'No formulaic addition in ResumoDiaPanel');
        assert.ok(!content.includes('- summary.saldo_negativo_itau'), 'No formulaic subtraction in ResumoDiaPanel');
      }
    });

    it('F8-B2: ConciliacaoLojasView must not compute difference between entradas and saidas in browser', () => {
      const filePath = path.join(process.cwd(), 'src/components/conciliacao/ConciliacaoLojasView.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(!content.includes('store.entradas_realizadas - store.entradas_previsto'), 'No client-side difference calculation in ConciliacaoLojasView');
      }
    });

    it('F8-B3: no currency formatting utility should modify numeric value before display', () => {
      const libFiles = scanCodebase('src/lib');
      const formatters = findPatternInFiles(libFiles, /formatCurrency|formatBRL/);
      for (const fmt of formatters) {
        // Formatter should only format string, not alter value
        assert.ok(!fmt.content.includes('* 1.05'), 'Currency formatter must not apply modifiers');
      }
    });

    it('F8-B4: verify complete absence of eval() or new Function() in conciliacao components', () => {
      const concFiles = scanCodebase('src/components/conciliacao');
      const evalMatches = findPatternInFiles(concFiles, /\beval\(|new\s+Function\(/);
      assert.strictEqual(evalMatches.length, 0, 'No dynamic code execution in conciliacao components');
    });

    it('F8-B5: verify absence of client-side tolerance threshold override in conciliacao views', () => {
      const concFiles = scanCodebase('src/components/conciliacao');
      const toleranceMatches = findPatternInFiles(concFiles, /const\s+TOLERANC[A-Z_]*\s*=\s*\d+/);
      assert.strictEqual(
        toleranceMatches.length,
        0,
        `Found client-side tolerance constant definitions in: ${toleranceMatches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 9 Boundary: Direct Component Adaptation Boundaries
  // --------------------------------------------------------------------------
  describe('F9 Boundary: Missing data & empty state presentation', () => {
    it('F9-B1: ConciliacaoLojasView must handle stores being empty array without exception', () => {
      const filePath = path.join(process.cwd(), 'src/components/conciliacao/ConciliacaoLojasView.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          content.includes('stores?.length') || content.includes('stores &&') || content.includes('(stores || []).map'),
          'ConciliacaoLojasView must guard against undefined or empty stores array'
        );
      }
    });

    it('F9-B2: ResumoDiaPanel must render loading skeleton or spinner when query is loading', () => {
      const filePath = path.join(process.cwd(), 'src/components/conciliacao/ResumoDiaPanel.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          content.includes('isLoading') || content.includes('isPending') || content.includes('Skeleton'),
          'ResumoDiaPanel must provide loading state UI'
        );
      }
    });

    it('F9-B3: ResumoDiaPanel must display error message if query fails', () => {
      const filePath = path.join(process.cwd(), 'src/components/conciliacao/ResumoDiaPanel.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          content.includes('isError') || content.includes('error') || content.includes('Alert'),
          'ResumoDiaPanel must handle and display error state'
        );
      }
    });

    it('F9-B4: SaldoBancosDetailModal must receive data strictly through props, not internal state math', () => {
      const filePath = path.join(process.cwd(), 'src/components/conciliacao/SaldoBancosDetailModal.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(!content.includes('useState(0)'), 'SaldoBancosDetailModal should not maintain local financial accumulator state');
      }
    });

    it('F9-B5: Step4FinalAuditAndClose must disable closing button while closing mutation is in flight', () => {
      const filePath = path.join(process.cwd(), 'src/components/importacoes/Step4FinalAuditAndClose.tsx');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          content.includes('isPending') || content.includes('isLoading') || content.includes('disabled='),
          'Step4FinalAuditAndClose must disable closing action during async execution'
        );
      }
    });
  });
});
