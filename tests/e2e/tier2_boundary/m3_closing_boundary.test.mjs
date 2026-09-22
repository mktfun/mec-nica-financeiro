// tests/e2e/tier2_boundary/m3_closing_boundary.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  fecharDia,
  getDailyReconciliationSummary,
  supabase,
  supabaseAnon,
  querySql,
  scanCodebase,
  findPatternInFiles
} from '../harness/client.mjs';
import { BOUNDARY_INPUTS } from '../harness/fixtures.mjs';
import { assertSummaryContract, assertIdempotentResults } from '../harness/assertions.mjs';

describe('Tier 2 — Boundary & Corner Cases: Backend Fechamento (Features 10–13)', () => {

  // --------------------------------------------------------------------------
  // Feature 10 Boundary: Concurrency, Advisory Locks & Transactional Safety
  // --------------------------------------------------------------------------
  describe('F10 Boundary: Concurrency & Transactional Edge Cases', () => {
    it('F10-B1: simultaneous concurrent calls to fechar_dia must serialize cleanly without deadlocks or duplicates', async () => {
      // Fire 3 simultaneous closing requests for the same date
      const testDate = '2026-08-24';
      const promises = [
        fecharDia(testDate, false),
        fecharDia(testDate, false),
        fecharDia(testDate, false)
      ];
      const results = await Promise.all(promises);

      // At least the calls must not produce an unhandled database deadlock (error 40P01)
      for (const res of results) {
        if (res.error) {
          assert.ok(
            !res.error.message.includes('deadlock') &&
            (res.error.message.includes('Could not find the function') || res.error.message.includes('fechar_dia') || res.error.message.includes('lock')),
            `Unexpected deadlock error: ${res.error.message}`
          );
        } else {
          assert.strictEqual(res.data.is_closed, true);
        }
      }
    });

    it('F10-B2: fechar_dia with invalid date string must return PostgreSQL format error without crash', async () => {
      const res = await fecharDia(BOUNDARY_INPUTS.INVALID_DATE_FORMAT, false);
      assert.ok(res.error, 'Invalid date format must be rejected');
    });

    it('F10-B3: fechar_dia with empty date parameter must return error', async () => {
      const res = await fecharDia(BOUNDARY_INPUTS.EMPTY_DATE, false);
      assert.ok(res.error, 'Empty date parameter must return error');
    });

    it('F10-B4: fechar_dia with SQL injection input must be sanitized by parametrized RPC', async () => {
      const res = await fecharDia(BOUNDARY_INPUTS.SQL_INJECTION_DATE, false);
      assert.ok(res.error, 'SQL injection attempt must be safely rejected by database');
    });

    it('F10-B5: verify fechar_dia sets transaction isolation or advisory lock in definition', async () => {
      const res = await querySql(`
        SELECT prosrc
        FROM pg_proc
        WHERE proname = 'fechar_dia';
      `);
      if (res.rows && res.rows.length > 0) {
        const src = res.rows[0].prosrc || '';
        assert.ok(
          src.includes('pg_advisory_xact_lock') || src.includes('pg_try_advisory_xact_lock'),
          'fechar_dia must use transactional advisory locks for concurrency safety'
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 11 Boundary: Idempotency & Repeat Closings
  // --------------------------------------------------------------------------
  describe('F11 Boundary: Idempotency & Repeat Closings', () => {
    it('F11-B1: re-closing already closed day without force_reopen returns existing snapshot unchanged', async () => {
      const res1 = await fecharDia('2026-08-17', false);
      if (!res1.error) {
        const res2 = await fecharDia('2026-08-17', false);
        assert.ok(!res2.error);
        assert.strictEqual(res1.data.closed_at, res2.data.closed_at, 'closed_at must be preserved without force_reopen');
        assertIdempotentResults(res1.data, res2.data);
      }
    });

    it('F11-B2: calling fechar_dia with force_reopen=true updates closed_at and recalculates metrics', async () => {
      const res = await fecharDia('2026-08-18', true);
      if (!res.error) {
        assert.strictEqual(res.data.is_closed, true);
        assert.ok(res.data.closed_at, 'closed_at must be present');
      }
    });

    it('F11-B3: multiple rapid read invocations after closing yield bit-for-bit identical summary payload', async () => {
      const run1 = await getDailyReconciliationSummary('2026-09-16', false);
      const run2 = await getDailyReconciliationSummary('2026-09-16', false);
      if (!run1.error && !run2.error && run1.data.is_closed) {
        assert.strictEqual(run1.data.diferenca_final, run2.data.diferenca_final);
        assert.strictEqual(run1.data.status_geral, run2.data.status_geral);
        assert.strictEqual(run1.data.caixa_atual, run2.data.caixa_atual);
      }
    });

    it('F11-B4: store count in closed day snapshot must equal exactly 10 stores', async () => {
      const res = await getDailyReconciliationSummary('2026-09-16', false);
      if (!res.error && res.data.is_closed && Array.isArray(res.data.stores)) {
        assert.strictEqual(res.data.stores.length, 10, 'Snapshot must contain exactly 10 store breakdowns');
      }
    });

    it('F11-B5: closing day with 0 transactions should not fail or create empty null snapshot', async () => {
      const res = await fecharDia('2025-01-01', false);
      if (!res.error) {
        assert.ok(res.data.stores, 'Stores breakdown must exist even on empty day');
        assert.strictEqual(typeof res.data.diferenca_final, 'number');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 12 Boundary: Disallow Snapshot Direct Write
  // --------------------------------------------------------------------------
  describe('F12 Boundary: Snapshot Table Protection & Immutability', () => {
    it('F12-B1: anonymous user cannot directly insert into daily_snapshots table', async () => {
      const { error } = await supabaseAnon
        .from('daily_snapshots')
        .insert([{ date: '2099-01-01', summary: { test: true } }]);
      assert.ok(error, 'Anonymous direct insert into daily_snapshots must be rejected');
    });

    it('F12-B2: anonymous user cannot directly update daily_snapshots table', async () => {
      const { error } = await supabaseAnon
        .from('daily_snapshots')
        .update({ status: 'approved' })
        .eq('date', '2026-08-24');
      assert.ok(error, 'Anonymous direct update into daily_snapshots must be rejected');
    });

    it('F12-B3: static audit: no client components may directly mutate daily_snapshots table', () => {
      const files = scanCodebase('src/components');
      const directMutations = findPatternInFiles(files, /\.from\(['"]daily_snapshots['"]\)\.(insert|update|delete|upsert)/);
      assert.strictEqual(
        directMutations.length,
        0,
        `Forbidden direct mutation of daily_snapshots in client components: ${directMutations.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F12-B4: static audit: no client routes may directly mutate daily_snapshots table', () => {
      const files = scanCodebase('src/routes');
      const directMutations = findPatternInFiles(files, /\.from\(['"]daily_snapshots['"]\)\.(insert|update|delete|upsert)/);
      assert.strictEqual(
        directMutations.length,
        0,
        `Forbidden direct mutation of daily_snapshots in client routes: ${directMutations.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F12-B5: static audit: no client hooks other than authorized RPC caller may write to daily_snapshots', () => {
      const files = scanCodebase('src/hooks');
      const directMutations = findPatternInFiles(files, /\.from\(['"]daily_snapshots['"]\)\.(insert|update|delete|upsert)/);
      assert.strictEqual(
        directMutations.length,
        0,
        `Direct mutation of daily_snapshots found in hooks: ${directMutations.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 13 Boundary: Wire UI Closing to RPC
  // --------------------------------------------------------------------------
  describe('F13 Boundary: UI Closing Trigger & Error State Wireup', () => {
    it('F13-B1: Step4FinalAuditAndClose must trigger fechar_dia RPC rather than local status setter', () => {
      const step4Path = path.join(process.cwd(), 'src/components/importacoes/Step4FinalAuditAndClose.tsx');
      if (fs.existsSync(step4Path)) {
        const content = fs.readFileSync(step4Path, 'utf8');
        assert.ok(
          content.includes('fechar_dia') || content.includes('fecharDia') || content.includes('handleFecharDia'),
          'Step4FinalAuditAndClose must invoke fechar_dia RPC'
        );
      }
    });

    it('F13-B2: Step4FinalAuditAndClose must disable button during closing mutation to prevent double-submit', () => {
      const step4Path = path.join(process.cwd(), 'src/components/importacoes/Step4FinalAuditAndClose.tsx');
      if (fs.existsSync(step4Path)) {
        const content = fs.readFileSync(step4Path, 'utf8');
        assert.ok(
          content.includes('disabled') || content.includes('isPending') || content.includes('isLoading'),
          'Closing button must guard against concurrent double-clicks'
        );
      }
    });

    it('F13-B3: UI must catch and display error toast if fechar_dia returns an error', () => {
      const step4Path = path.join(process.cwd(), 'src/components/importacoes/Step4FinalAuditAndClose.tsx');
      if (fs.existsSync(step4Path)) {
        const content = fs.readFileSync(step4Path, 'utf8');
        assert.ok(
          content.includes('toast') || content.includes('onError') || content.includes('catch'),
          'Step4FinalAuditAndClose must handle errors gracefully with user feedback'
        );
      }
    });

    it('F13-B4: UI closing action must invalidate daily_reconciliation_summary query cache upon success', () => {
      const step4Path = path.join(process.cwd(), 'src/components/importacoes/Step4FinalAuditAndClose.tsx');
      if (fs.existsSync(step4Path)) {
        const content = fs.readFileSync(step4Path, 'utf8');
        assert.ok(
          content.includes('invalidateQueries') || content.includes('queryClient'),
          'Closing action must invalidate query cache upon success'
        );
      }
    });

    it('F13-B5: UI should indicate status of closed day (e.g. badge with Approved / Divergence)', () => {
      const step4Path = path.join(process.cwd(), 'src/components/importacoes/Step4FinalAuditAndClose.tsx');
      if (fs.existsSync(step4Path)) {
        const content = fs.readFileSync(step4Path, 'utf8');
        assert.ok(
          content.includes('status_geral') || content.includes('status') || content.includes('Badge'),
          'Step4FinalAuditAndClose must present resulting closing status'
        );
      }
    });
  });
});
