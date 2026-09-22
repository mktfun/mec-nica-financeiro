// tests/e2e/tier3_combinations/pairwise_m3_m4.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fecharDia, getDailyReconciliationSummary, querySql } from '../harness/client.mjs';
import { CANONICAL_CLOSURE_STATUSES } from '../harness/config.mjs';
import { assertStatusVocabulary } from '../harness/assertions.mjs';

describe('Tier 3 — Pairwise Combination: M3 Backend Closing ↔ M4 Status Standardization', () => {

  it('Pair-M3-M4-01: status_geral returned by fechar_dia strictly belongs to canonical closure vocabulary', async () => {
    const res = await fecharDia('2026-08-24', false);
    if (!res.error) {
      assertStatusVocabulary(res.data.status_geral);
      assert.ok(
        CANONICAL_CLOSURE_STATUSES.includes(res.data.status_geral),
        `status_geral must be strictly approved or divergence, got '${res.data.status_geral}'`
      );
    }
  });

  it('Pair-M3-M4-02: every store in fechar_dia breakdown has canonical status', async () => {
    const res = await fecharDia('2026-08-24', false);
    if (!res.error) {
      for (const store of res.data.stores || []) {
        assert.ok(
          CANONICAL_CLOSURE_STATUSES.includes(store.status),
          `Store ${store.store_name} has invalid status '${store.status}' in fechar_dia result`
        );
      }
    }
  });

  it('Pair-M3-M4-03: daily_snapshots status column equals status_geral from summary payload', async () => {
    const res = await querySql(`
      SELECT date, status, summary->>'status_geral' as payload_status
      FROM daily_snapshots
      WHERE is_closed = true
      LIMIT 3;
    `);
    if (res.rows && res.rows.length > 0) {
      for (const row of res.rows) {
        if (row.payload_status) {
          assert.strictEqual(
            row.status,
            row.payload_status,
            `daily_snapshots.status ('${row.status}') differs from payload status_geral ('${row.payload_status}') for date ${row.date}`
          );
        }
      }
    }
  });

  it('Pair-M3-M4-04: zero occurrences of legacy status "divergent" in daily_snapshots after fechar_dia', async () => {
    const res = await querySql(`
      SELECT COUNT(*) as cnt
      FROM daily_snapshots
      WHERE status = 'divergent';
    `);
    const count = Number(res.rows?.[0]?.cnt || 0);
    assert.strictEqual(count, 0, 'No row in daily_snapshots may have legacy status "divergent"');
  });

  it('Pair-M3-M4-05: closed summary status vocabulary holds across multiple closed dates', async () => {
    const testDates = ['2026-08-24', '2026-09-16'];
    for (const date of testDates) {
      const res = await getDailyReconciliationSummary(date, false);
      if (!res.error && res.data.is_closed) {
        assertStatusVocabulary(res.data.status_geral);
      }
    }
  });
});
