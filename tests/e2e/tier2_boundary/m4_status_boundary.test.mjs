// tests/e2e/tier2_boundary/m4_status_boundary.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { querySql, scanCodebase, findPatternInFiles } from '../harness/client.mjs';
import {
  CANONICAL_MATCH_STATUSES,
  CANONICAL_CLOSURE_STATUSES
} from '../harness/config.mjs';

describe('Tier 2 — Boundary & Corner Cases: Status Standardization (Features 14–17)', () => {

  // --------------------------------------------------------------------------
  // Feature 14 Boundary: Vocabulary constraints & casing
  // --------------------------------------------------------------------------
  describe('F14 Boundary: String formatting & casing constraints', () => {
    it('F14-B1: database must not contain uppercase or titlecase closure statuses', async () => {
      const res = await querySql(`
        SELECT DISTINCT status
        FROM daily_snapshots
        WHERE status IN ('APPROVED', 'Approved', 'DIVERGENCE', 'Divergence', 'Divergent');
      `);
      assert.strictEqual(
        (res.rows || []).length,
        0,
        `Found non-lowercase or invalid closure status in daily_snapshots: ${JSON.stringify(res.rows)}`
      );
    });

    it('F14-B2: database must not contain statuses with whitespace padding', async () => {
      const res = await querySql(`
        SELECT id, match_status
        FROM ofx_transactions
        WHERE match_status LIKE ' %' OR match_status LIKE '% '
        LIMIT 5;
      `);
      assert.strictEqual(
        (res.rows || []).length,
        0,
        `Found whitespace-padded match_status values in ofx_transactions`
      );
    });

    it('F14-B3: daily_snapshots must not contain legacy "divergent" status', async () => {
      const res = await querySql(`
        SELECT COUNT(*) as cnt
        FROM daily_snapshots
        WHERE status = 'divergent';
      `);
      const count = Number(res.rows?.[0]?.cnt || 0);
      assert.strictEqual(
        count,
        0,
        `daily_snapshots still contains ${count} rows with legacy 'divergent' status! Must be migrated to 'divergence'.`
      );
    });

    it('F14-B4: ofx_transactions must not contain legacy Portuguese match statuses', async () => {
      const res = await querySql(`
        SELECT COUNT(*) as cnt
        FROM ofx_transactions
        WHERE match_status IN ('conciliado', 'pendente', 'divergente', 'cancelado', 'ignorado');
      `);
      const count = Number(res.rows?.[0]?.cnt || 0);
      assert.strictEqual(
        count,
        0,
        `ofx_transactions still contains ${count} rows with legacy Portuguese statuses`
      );
    });

    it('F14-B5: empty string match_status should be rejected or treated as null/pending', async () => {
      const res = await querySql(`
        SELECT COUNT(*) as cnt
        FROM ofx_transactions
        WHERE match_status = '';
      `);
      const count = Number(res.rows?.[0]?.cnt || 0);
      assert.strictEqual(count, 0, 'No empty string match_status should exist');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 15 Boundary: TypeScript Constants Immutability & Contracts
  // --------------------------------------------------------------------------
  describe('F15 Boundary: TypeScript Constants Immutability', () => {
    it('F15-B1: src/types/status.ts must exist and declare "as const" on all enum dictionaries', () => {
      const statusPath = path.join(process.cwd(), 'src/types/status.ts');
      assert.ok(fs.existsSync(statusPath), 'src/types/status.ts must exist');
      const content = fs.readFileSync(statusPath, 'utf8');
      assert.ok(content.includes('as const'), 'status dictionaries must be declared "as const" for type safety');
    });

    it('F15-B2: RECONCILIATION_MATCH_STATUS keys must strictly be uppercase identifiers', () => {
      const statusPath = path.join(process.cwd(), 'src/types/status.ts');
      if (fs.existsSync(statusPath)) {
        const content = fs.readFileSync(statusPath, 'utf8');
        const expectedKeys = ['PENDING', 'MATCHED', 'BATCH', 'INTERCOMPANY', 'CANCELLED', 'IGNORED'];
        for (const key of expectedKeys) {
          assert.ok(content.includes(`${key}:`), `RECONCILIATION_MATCH_STATUS missing key ${key}`);
        }
      }
    });

    it('F15-B3: CLOSURE_STATUS keys must strictly be APPROVED and DIVERGENCE', () => {
      const statusPath = path.join(process.cwd(), 'src/types/status.ts');
      if (fs.existsSync(statusPath)) {
        const content = fs.readFileSync(statusPath, 'utf8');
        assert.ok(content.includes('APPROVED:'), 'CLOSURE_STATUS missing APPROVED key');
        assert.ok(content.includes('DIVERGENCE:'), 'CLOSURE_STATUS missing DIVERGENCE key');
        assert.ok(!content.includes('DIVERGENT:'), 'CLOSURE_STATUS must NOT have legacy DIVERGENT key');
      }
    });

    it('F15-B4: status.ts should export Type unions derived from the constant objects', () => {
      const statusPath = path.join(process.cwd(), 'src/types/status.ts');
      if (fs.existsSync(statusPath)) {
        const content = fs.readFileSync(statusPath, 'utf8');
        assert.ok(
          content.includes('type ReconciliationMatchStatus') || content.includes('type ClosureStatus'),
          'status.ts should export type definitions for TypeScript consumers'
        );
      }
    });

    it('F15-B5: status.ts must not contain mutable arrays or let declarations', () => {
      const statusPath = path.join(process.cwd(), 'src/types/status.ts');
      if (fs.existsSync(statusPath)) {
        const content = fs.readFileSync(statusPath, 'utf8');
        assert.ok(!content.includes('let '), 'status.ts must only declare const, no let');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 16 Boundary: Data Migration Edge Checks
  // --------------------------------------------------------------------------
  describe('F16 Boundary: Data Migration Edge Checks', () => {
    it('F16-B1: database check constraint on daily_snapshots status column', async () => {
      const res = await querySql(`
        SELECT conname, pg_get_constraintdef(oid) as def
        FROM pg_constraint
        WHERE conrelid = 'daily_snapshots'::regclass AND contype = 'c';
      `);
      if (res.rows && res.rows.length > 0) {
        const checkDef = res.rows.map(r => r.def).join(' ');
        if (checkDef.includes('status')) {
          assert.ok(checkDef.includes('approved') && checkDef.includes('divergence'), 'Constraint must allow approved and divergence');
        }
      }
    });

    it('F16-B2: verify no null status in daily_snapshots for closed days', async () => {
      const res = await querySql(`
        SELECT COUNT(*) as cnt
        FROM daily_snapshots
        WHERE is_closed = true AND (status IS NULL OR status = '');
      `);
      const count = Number(res.rows?.[0]?.cnt || 0);
      assert.strictEqual(count, 0, 'No closed snapshot may have null or empty status');
    });

    it('F16-B3: snapshot summary jsonb stores must all have status "approved" or "divergence"', async () => {
      const res = await querySql(`
        SELECT date, summary->'stores' as stores
        FROM daily_snapshots
        WHERE is_closed = true
        LIMIT 5;
      `);
      if (res.rows) {
        for (const row of res.rows) {
          const stores = row.stores || [];
          if (Array.isArray(stores)) {
            for (const store of stores) {
              if (store.status) {
                assert.ok(
                  CANONICAL_CLOSURE_STATUSES.includes(store.status),
                  `Snapshot ${row.date} store ${store.store_name} has invalid status '${store.status}'`
                );
              }
            }
          }
        }
      }
    });

    it('F16-B4: manual_transactions match_status must belong to canonical vocabulary', async () => {
      const res = await querySql(`
        SELECT DISTINCT match_status
        FROM manual_transactions
        WHERE match_status IS NOT NULL;
      `);
      if (res.rows) {
        for (const row of res.rows) {
          assert.ok(
            CANONICAL_MATCH_STATUSES.includes(row.match_status),
            `manual_transactions has non-canonical match_status: '${row.match_status}'`
          );
        }
      }
    });

    it('F16-B5: daily_bills match_status must belong to canonical vocabulary', async () => {
      const res = await querySql(`
        SELECT DISTINCT match_status
        FROM daily_bills
        WHERE match_status IS NOT NULL;
      `);
      if (res.rows) {
        for (const row of res.rows) {
          assert.ok(
            CANONICAL_MATCH_STATUSES.includes(row.match_status),
            `daily_bills has non-canonical match_status: '${row.match_status}'`
          );
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 17 Boundary: Code Status Refactoring Audit
  // --------------------------------------------------------------------------
  describe('F17 Boundary: Code Status Refactoring Audit', () => {
    it('F17-B1: verify zero occurrences of === "divergent" in src/components and src/routes', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /===\s*['"]divergent['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found legacy raw string comparison 'divergent' in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F17-B2: verify zero occurrences of === "conciliado" in active logic', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /===\s*['"]conciliado['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found legacy raw string comparison 'conciliado' in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F17-B3: verify zero occurrences of === "pendente" in active logic', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /===\s*['"]pendente['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found legacy raw string comparison 'pendente' in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F17-B4: verify zero occurrences of status === "divergente" in active logic', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /status\s*===\s*['"]divergente['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found legacy comparison status === 'divergente' in: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F17-B5: verify zero raw string status mutation payload objects', () => {
      const files = scanCodebase('src/components');
      const matches = findPatternInFiles(files, /match_status:\s*['"](conciliado|pendente)['"]/);
      assert.strictEqual(
        matches.length,
        0,
        `Found raw legacy status in mutation payloads: ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });
  });
});
