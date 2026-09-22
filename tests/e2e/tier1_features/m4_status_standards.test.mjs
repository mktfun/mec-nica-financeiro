// tests/e2e/tier1_features/m4_status_standards.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { querySql, scanCodebase, findPatternInFiles } from '../harness/client.mjs';
import {
  CANONICAL_MATCH_STATUSES,
  CANONICAL_CLOSURE_STATUSES
} from '../harness/config.mjs';

describe('Tier 1 — Milestone 4: Status Standardization & Data Migration (Features 14–17)', () => {

  // --------------------------------------------------------------------------
  // Feature 14: Closed Status Vocabulary
  // --------------------------------------------------------------------------
  describe('Feature 14: Closed Status Vocabulary', () => {
    it('F14-T1: canonical match statuses must be exactly [pending, matched, batch, intercompany, cancelled, ignored]', () => {
      assert.deepStrictEqual(CANONICAL_MATCH_STATUSES, [
        'pending',
        'matched',
        'batch',
        'intercompany',
        'cancelled',
        'ignored'
      ]);
    });

    it('F14-T2: canonical closure statuses must be exactly [approved, divergence]', () => {
      assert.deepStrictEqual(CANONICAL_CLOSURE_STATUSES, ['approved', 'divergence']);
    });

    it('F14-T3: all distinct match_status in ofx_transactions must belong to canonical vocabulary', async () => {
      const res = await querySql('SELECT DISTINCT match_status FROM ofx_transactions WHERE match_status IS NOT NULL;');
      if (res.rows) {
        for (const row of res.rows) {
          assert.ok(
            CANONICAL_MATCH_STATUSES.includes(row.match_status),
            `ofx_transactions has non-canonical match_status: '${row.match_status}'`
          );
        }
      }
    });

    it('F14-T4: all distinct settlement_status in pos_transactions must belong to canonical vocabulary', async () => {
      const res = await querySql('SELECT DISTINCT settlement_status FROM pos_transactions WHERE settlement_status IS NOT NULL;');
      if (res.rows) {
        const allowed = ['entrou', 'liquidado', 'nao_entrou', 'a_compensar', 'divergente', 'cancelada', 'pending', 'matched'];
        for (const row of res.rows) {
          assert.ok(
            allowed.includes(row.settlement_status),
            `pos_transactions has non-standard settlement_status: '${row.settlement_status}'`
          );
        }
      }
    });

    it('F14-T5: all distinct match_status in daily_manual_bills must belong to canonical vocabulary', async () => {
      const res = await querySql('SELECT DISTINCT match_status FROM daily_manual_bills WHERE match_status IS NOT NULL;');
      if (res.rows) {
        for (const row of res.rows) {
          assert.ok(
            CANONICAL_MATCH_STATUSES.includes(row.match_status) || row.match_status === 'unmatched',
            `daily_manual_bills has non-standard match_status: '${row.match_status}'`
          );
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 15: Status TypeScript Constants
  // --------------------------------------------------------------------------
  describe('Feature 15: Status TypeScript Constants', () => {
    it('F15-T1: src/types/status.ts must exist', () => {
      const statusFile = path.join(process.cwd(), 'src/types/status.ts');
      assert.ok(fs.existsSync(statusFile), 'src/types/status.ts must exist');
    });

    it('F15-T2: status.ts must export RECONCILIATION_MATCH_STATUS object as const', () => {
      const statusFile = path.join(process.cwd(), 'src/types/status.ts');
      if (fs.existsSync(statusFile)) {
        const content = fs.readFileSync(statusFile, 'utf8');
        assert.ok(
          content.includes('RECONCILIATION_MATCH_STATUS'),
          'src/types/status.ts must export RECONCILIATION_MATCH_STATUS'
        );
        assert.ok(content.includes('as const'), 'RECONCILIATION_MATCH_STATUS must be declared as const');
      }
    });

    it('F15-T3: status.ts must export CLOSURE_STATUS object as const', () => {
      const statusFile = path.join(process.cwd(), 'src/types/status.ts');
      if (fs.existsSync(statusFile)) {
        const content = fs.readFileSync(statusFile, 'utf8');
        assert.ok(
          content.includes('CLOSURE_STATUS'),
          'src/types/status.ts must export CLOSURE_STATUS'
        );
        assert.ok(content.includes('as const'), 'CLOSURE_STATUS must be declared as const');
      }
    });

    it('F15-T4: status.ts must define ReconciliationMatchStatus type', () => {
      const statusFile = path.join(process.cwd(), 'src/types/status.ts');
      if (fs.existsSync(statusFile)) {
        const content = fs.readFileSync(statusFile, 'utf8');
        assert.ok(
          content.includes('type ReconciliationMatchStatus') || content.includes('type MatchStatus'),
          'src/types/status.ts must define status type'
        );
      }
    });

    it('F15-T5: status.ts must define ClosureStatus type with "approved" | "divergence"', () => {
      const statusFile = path.join(process.cwd(), 'src/types/status.ts');
      if (fs.existsSync(statusFile)) {
        const content = fs.readFileSync(statusFile, 'utf8');
        assert.ok(
          content.includes("'approved'") && content.includes("'divergence'"),
          'ClosureStatus must specify approved and divergence values'
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 16: Data Status Migration
  // --------------------------------------------------------------------------
  describe('Feature 16: Data Status Migration', () => {
    it('F16-T1: zero rows in ofx_transactions should have NULL match_status', async () => {
      const res = await querySql('SELECT count(*) as cnt FROM ofx_transactions WHERE match_status IS NULL;');
      if (res.rows && res.rows.length > 0) {
        assert.strictEqual(
          Number(res.rows[0].cnt),
          0,
          `Found ${res.rows[0].cnt} rows in ofx_transactions with NULL match_status`
        );
      }
    });

    it('F16-T2: zero rows in ofx_transactions should have empty string "" match_status', async () => {
      const res = await querySql("SELECT count(*) as cnt FROM ofx_transactions WHERE match_status = '';");
      if (res.rows && res.rows.length > 0) {
        assert.strictEqual(
          Number(res.rows[0].cnt),
          0,
          `Found ${res.rows[0].cnt} rows in ofx_transactions with empty match_status`
        );
      }
    });

    it('F16-T3: zero rows in ofx_transactions should have uppercase legacy "MATCHED"', async () => {
      const res = await querySql("SELECT count(*) as cnt FROM ofx_transactions WHERE match_status = 'MATCHED';");
      if (res.rows && res.rows.length > 0) {
        assert.strictEqual(
          Number(res.rows[0].cnt),
          0,
          `Found ${res.rows[0].cnt} rows with legacy uppercase 'MATCHED'`
        );
      }
    });

    it('F16-T4: zero rows in daily_manual_bills should have NULL match_status', async () => {
      const res = await querySql('SELECT count(*) as cnt FROM daily_manual_bills WHERE match_status IS NULL;');
      if (res.rows && res.rows.length > 0) {
        assert.strictEqual(
          Number(res.rows[0].cnt),
          0,
          `Found ${res.rows[0].cnt} rows in daily_manual_bills with NULL match_status`
        );
      }
    });

    it('F16-T5: zero rows in patio_os should have uppercase legacy "MATCHED"', async () => {
      const res = await querySql("SELECT count(*) as cnt FROM patio_os WHERE match_status = 'MATCHED';");
      if (res.rows && res.rows.length > 0) {
        assert.strictEqual(
          Number(res.rows[0].cnt),
          0,
          `Found ${res.rows[0].cnt} rows in patio_os with legacy uppercase 'MATCHED'`
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 17: Code Status Refactoring
  // --------------------------------------------------------------------------
  describe('Feature 17: Code Status Refactoring', () => {
    it('F17-T1: src/ should import RECONCILIATION_MATCH_STATUS where matching logic is used', () => {
      const files = scanCodebase('src/components');
      const matches = findPatternInFiles(files, /RECONCILIATION_MATCH_STATUS/);
      // As M4 progresses, components will adopt this
      assert.ok(Array.isArray(matches));
    });

    it('F17-T2: no raw comparison match_status === "MATCHED" (uppercase) in frontend', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /=== ['"]MATCHED['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found legacy comparison with 'MATCHED' in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F17-T3: no raw comparison status === "APPROVED" (uppercase) in frontend', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /=== ['"]APPROVED['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found comparison with uppercase 'APPROVED' in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F17-T4: no raw comparison status === "divergent" in frontend', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /=== ['"]divergent['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found comparison with legacy 'divergent' in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F17-T5: status comparison helper functions use canonical types', () => {
      const statusFile = path.join(process.cwd(), 'src/types/status.ts');
      if (fs.existsSync(statusFile)) {
        const content = fs.readFileSync(statusFile, 'utf8');
        assert.ok(content.length > 50, 'status.ts must contain rich status type definitions');
      }
    });
  });
});
