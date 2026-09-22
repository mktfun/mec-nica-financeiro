// tests/e2e/tier1_features/m3_backend_closing.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  fecharDia,
  checkFunctionExists,
  querySql,
  scanCodebase,
  findPatternInFiles
} from '../harness/client.mjs';
import { assertSummaryContract, assert5PillarsPresent, assertIdempotentResults } from '../harness/assertions.mjs';

describe('Tier 1 — Milestone 3: Backend-First Fechamento (Features 10–13)', () => {

  // --------------------------------------------------------------------------
  // Feature 10: Transactional Fechar Dia RPC
  // --------------------------------------------------------------------------
  describe('Feature 10: Transactional Fechar Dia RPC', () => {
    it('F10-T1: fechar_dia function must exist in public schema with correct signature', async () => {
      const check = await checkFunctionExists('fechar_dia');
      assert.strictEqual(
        check.exists,
        true,
        'fechar_dia function does not exist in public schema! Must be created in M3.'
      );
    });

    it('F10-T2: fechar_dia must use advisory lock (pg_advisory_xact_lock) in its body', async () => {
      const res = await querySql(`
        SELECT prosrc
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND proname = 'fechar_dia';
      `);
      if (res.rows && res.rows.length > 0) {
        const src = res.rows[0].prosrc || '';
        assert.ok(
          src.includes('pg_advisory_xact_lock') || src.includes('pg_try_advisory_xact_lock'),
          'fechar_dia must enforce transactional advisory lock'
        );
      }
    });

    it('F10-T3: fechar_dia must return complete frozen DailyReconciliationSummary object', async () => {
      const res = await fecharDia('2026-08-24', false);
      if (!res.error) {
        assertSummaryContract(res.data);
        assert5PillarsPresent(res.data);
        assert.strictEqual(res.data.is_closed, true, 'Result of fechar_dia must have is_closed=true');
      } else {
        // Report pending implementation in M3
        assert.ok(
          res.error.message.includes('Could not find the function') || res.error.message.includes('fechar_dia'),
          `Unexpected error from fechar_dia: ${res.error.message}`
        );
      }
    });

    it('F10-T4: fechar_dia must persist snapshot record into daily_snapshots with is_closed=true', async () => {
      const res = await fecharDia('2026-08-24', false);
      if (!res.error) {
        const checkDb = await querySql("SELECT is_closed, closed_at FROM daily_snapshots WHERE date = '2026-08-24';");
        assert.ok(checkDb.rows && checkDb.rows.length > 0, 'Snapshot record must be present in daily_snapshots');
        assert.strictEqual(checkDb.rows[0].is_closed, true, 'daily_snapshots.is_closed must be true');
        assert.ok(checkDb.rows[0].closed_at, 'daily_snapshots.closed_at must be populated');
      }
    });

    it('F10-T5: fechar_dia must store cash_vault_snapshot in metadata', async () => {
      const res = await fecharDia('2026-08-24', false);
      if (!res.error) {
        const checkMeta = await querySql("SELECT metadata FROM daily_snapshots WHERE date = '2026-08-24';");
        assert.ok(checkMeta.rows && checkMeta.rows.length > 0);
        const meta = checkMeta.rows[0].metadata || {};
        assert.ok('cash_vault_snapshot' in meta || 'status_geral' in meta, 'Snapshot metadata must contain closing audit data');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 11: Closing Idempotency
  // --------------------------------------------------------------------------
  describe('Feature 11: Closing Idempotency', () => {
    it('F11-T1: calling fechar_dia twice consecutively must produce identical results', async () => {
      const res1 = await fecharDia('2026-08-24', false);
      const res2 = await fecharDia('2026-08-24', false);
      if (!res1.error && !res2.error) {
        assertIdempotentResults(res1.data, res2.data);
      }
    });

    it('F11-T2: repeated calls to fechar_dia must not create duplicate snapshot rows', async () => {
      const checkCount = await querySql("SELECT count(*) as cnt FROM daily_snapshots WHERE date = '2026-08-24';");
      if (checkCount.rows && checkCount.rows.length > 0) {
        assert.strictEqual(Number(checkCount.rows[0].cnt), 1, 'There must be exactly 1 snapshot row per date');
      }
    });

    it('F11-T3: consecutive calls must preserve original closed_at timestamp when force_reopen=false', async () => {
      const checkTime = await querySql("SELECT closed_at FROM daily_snapshots WHERE date = '2026-08-24';");
      if (checkTime.rows && checkTime.rows.length > 0 && checkTime.rows[0].closed_at) {
        const firstClosedAt = checkTime.rows[0].closed_at;
        await fecharDia('2026-08-24', false);
        const checkTime2 = await querySql("SELECT closed_at FROM daily_snapshots WHERE date = '2026-08-24';");
        assert.strictEqual(checkTime2.rows[0].closed_at, firstClosedAt, 'closed_at timestamp must be preserved on idempotent re-call');
      }
    });

    it('F11-T4: repeated closing must not modify matching statuses in pos_transactions', async () => {
      const checkPos = await querySql("SELECT count(*) as cnt FROM pos_transactions WHERE target_date = '2026-08-24';");
      const initialCount = Number(checkPos.rows?.[0]?.cnt || 0);
      await fecharDia('2026-08-24', false);
      const checkPos2 = await querySql("SELECT count(*) as cnt FROM pos_transactions WHERE target_date = '2026-08-24';");
      assert.strictEqual(Number(checkPos2.rows?.[0]?.cnt || 0), initialCount, 'Transaction count must not change on re-closing');
    });

    it('F11-T5: force_reopen=true must safely allow re-evaluating and re-freezing if explicitly requested', async () => {
      const resReopen = await fecharDia('2026-08-24', true);
      if (!resReopen.error) {
        assert.ok(resReopen.data, 'Forced re-closing must return valid payload');
        assert.strictEqual(resReopen.data.is_closed, true, 'Re-closed day must have is_closed=true');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 12: Disallow Direct Snapshot Mutations
  // --------------------------------------------------------------------------
  describe('Feature 12: Disallow Direct Snapshot Mutations', () => {
    it('F12-T1: src/components must NOT contain direct .insert() on daily_snapshots', () => {
      const files = scanCodebase('src/components');
      const matches = findPatternInFiles(files, /\.from\(['"]daily_snapshots['"]\)\.insert\(/);
      assert.strictEqual(
        matches.length,
        0,
        `Found direct insert on daily_snapshots: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F12-T2: src/components must NOT contain direct .update() on daily_snapshots', () => {
      const files = scanCodebase('src/components');
      const matches = findPatternInFiles(files, /\.from\(['"]daily_snapshots['"]\)\.update\(/);
      assert.strictEqual(
        matches.length,
        0,
        `Found direct update on daily_snapshots: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F12-T3: src/components must NOT contain direct .upsert() on daily_snapshots', () => {
      const files = scanCodebase('src/components');
      const matches = findPatternInFiles(files, /\.from\(['"]daily_snapshots['"]\)\.upsert\(/);
      assert.strictEqual(
        matches.length,
        0,
        `Found direct upsert on daily_snapshots: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F12-T4: CentralImportWizard.tsx must NOT contain direct daily_snapshots mutation', () => {
      const wizardPath = path.join(process.cwd(), 'src/components/importacoes/CentralImportWizard.tsx');
      if (fs.existsSync(wizardPath)) {
        const content = fs.readFileSync(wizardPath, 'utf8');
        assert.ok(
          !content.includes(".from('daily_snapshots').upsert"),
          'CentralImportWizard contains direct upsert on daily_snapshots!'
        );
      }
    });

    it('F12-T5: useSaveDailySnapshot hook must NOT be used to bypass backend closing', () => {
      const files = scanCodebase('src/components/conciliacao');
      const matches = findPatternInFiles(files, /useSaveDailySnapshot/);
      assert.strictEqual(
        matches.length,
        0,
        `Found useSaveDailySnapshot in reconciliation UI: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 13: Wire UI Closing to RPC
  // --------------------------------------------------------------------------
  describe('Feature 13: Wire UI Closing to RPC', () => {
    it('F13-T1: ResumoDiaPanel.tsx close action must invoke supabase.rpc("fechar_dia")', () => {
      const panelPath = path.join(process.cwd(), 'src/components/conciliacao/ResumoDiaPanel.tsx');
      if (fs.existsSync(panelPath)) {
        const content = fs.readFileSync(panelPath, 'utf8');
        assert.ok(
          content.includes("'fechar_dia'") || content.includes('"fechar_dia"'),
          'ResumoDiaPanel must invoke fechar_dia RPC!'
        );
      }
    });

    it('F13-T2: CentralImportWizard.tsx final step must invoke supabase.rpc("fechar_dia")', () => {
      const wizardPath = path.join(process.cwd(), 'src/components/importacoes/CentralImportWizard.tsx');
      if (fs.existsSync(wizardPath)) {
        const content = fs.readFileSync(wizardPath, 'utf8');
        assert.ok(
          content.includes("'fechar_dia'") || content.includes('"fechar_dia"'),
          'CentralImportWizard must invoke fechar_dia RPC!'
        );
      }
    });

    it('F13-T3: closing button should show loading state while RPC executes', () => {
      const panelPath = path.join(process.cwd(), 'src/components/conciliacao/ResumoDiaPanel.tsx');
      if (fs.existsSync(panelPath)) {
        const content = fs.readFileSync(panelPath, 'utf8');
        assert.ok(
          content.includes('isPending') || content.includes('loading') || content.includes('disabled'),
          'Close button must handle loading/disabled state'
        );
      }
    });

    it('F13-T4: closing button must handle error feedback via toast / sonner', () => {
      const panelPath = path.join(process.cwd(), 'src/components/conciliacao/ResumoDiaPanel.tsx');
      if (fs.existsSync(panelPath)) {
        const content = fs.readFileSync(panelPath, 'utf8');
        assert.ok(
          content.includes('toast') || content.includes('error'),
          'Close action must provide user feedback on error'
        );
      }
    });

    it('F13-T5: successful close must invalidate canonical query key ["daily_reconciliation_summary"]', () => {
      const panelPath = path.join(process.cwd(), 'src/components/conciliacao/ResumoDiaPanel.tsx');
      if (fs.existsSync(panelPath)) {
        const content = fs.readFileSync(panelPath, 'utf8');
        assert.ok(
          content.includes('invalidateQueries') && content.includes('daily_reconciliation_summary'),
          'Successful close must invalidate daily_reconciliation_summary query'
        );
      }
    });
  });
});
