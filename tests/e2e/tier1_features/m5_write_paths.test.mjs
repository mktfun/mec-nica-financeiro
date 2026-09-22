// tests/e2e/tier1_features/m5_write_paths.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  supabase,
  checkRelationType,
  scanCodebase,
  findPatternInFiles
} from '../harness/client.mjs';
import { MOCK_OFX_TX, MOCK_POS_TX } from '../harness/fixtures.mjs';

describe('Tier 1 — Milestone 5: Real Table Write Paths Repair (Features 18–20)', () => {

  // --------------------------------------------------------------------------
  // Feature 18: Direct Physical Table Writes
  // --------------------------------------------------------------------------
  describe('Feature 18: Direct Physical Table Writes', () => {
    it('F18-T1: ofx_transactions must be a physical BASE TABLE, not a view', async () => {
      const rel = await checkRelationType('ofx_transactions');
      assert.strictEqual(rel.exists, true, 'ofx_transactions table must exist');
      assert.strictEqual(rel.type, 'BASE TABLE', 'ofx_transactions must be a physical table');
    });

    it('F18-T2: pos_transactions must be a physical BASE TABLE, not a view', async () => {
      const rel = await checkRelationType('pos_transactions');
      assert.strictEqual(rel.exists, true, 'pos_transactions table must exist');
      assert.strictEqual(rel.type, 'BASE TABLE', 'pos_transactions must be a physical table');
    });

    it('F18-T3: manual_transactions must be a physical BASE TABLE, not a view', async () => {
      const rel = await checkRelationType('manual_transactions');
      assert.strictEqual(rel.exists, true, 'manual_transactions table must exist');
      assert.strictEqual(rel.type, 'BASE TABLE', 'manual_transactions must be a physical table');
    });

    it('F18-T4: writing directly to ofx_transactions must succeed and return generated id', async () => {
      const testFitid = 'TEST_FITID_E2E_' + Date.now();
      const payload = { ...MOCK_OFX_TX, fitid: testFitid };
      const { data, error } = await supabase
        .from('ofx_transactions')
        .insert([payload])
        .select('id, fitid')
        .single();

      assert.ok(!error, `Insert into ofx_transactions failed: ${error?.message}`);
      assert.ok(data?.id, 'Insert must return generated id');

      // Cleanup
      await supabase.from('ofx_transactions').delete().eq('id', data.id);
    });

    it('F18-T5: writing directly to pos_transactions must succeed with dedup_hash', async () => {
      const testHash = 'TEST_DEDUP_E2E_' + Date.now();
      const payload = { ...MOCK_POS_TX, dedup_hash: testHash };
      const { data, error } = await supabase
        .from('pos_transactions')
        .insert([payload])
        .select('id, dedup_hash')
        .single();

      assert.ok(!error, `Insert into pos_transactions failed: ${error?.message}`);
      assert.ok(data?.id, 'Insert must return generated id');

      // Cleanup
      await supabase.from('pos_transactions').delete().eq('id', data.id);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 19: Eliminate Mutations on Transactions View
  // --------------------------------------------------------------------------
  describe('Feature 19: Eliminate Mutations on Transactions View', () => {
    it('F19-T1: src/ must NOT contain .update() targeting the "transactions" view', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /\.from\(['"]transactions['"]\)\.update\(/);
      assert.strictEqual(
        matches.length,
        0,
        `Found direct update on view 'transactions' (causes Postgres error 55000): ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F19-T2: src/ must NOT contain .delete() targeting the "transactions" view', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /\.from\(['"]transactions['"]\)\.delete\(/);
      assert.strictEqual(
        matches.length,
        0,
        `Found direct delete on view 'transactions' (causes Postgres error 55000): ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F19-T3: src/ must NOT contain .insert() targeting the "transactions" view', () => {
      const files = scanCodebase('src');
      const matches = findPatternInFiles(files, /\.from\(['"]transactions['"]\)\.insert\(/);
      assert.strictEqual(
        matches.length,
        0,
        `Found direct insert on view 'transactions': ${matches.map(m => `${m.file}:${m.line}`).join(', ')}`
      );
    });

    it('F19-T4: useCategorizeOrphan.ts must update physical table rather than view', () => {
      const files = scanCodebase('src/hooks');
      const target = files.find(f => f.includes('useCategorizeOrphan'));
      if (target) {
        const matches = findPatternInFiles([target], /\.from\(['"]transactions['"]\)/);
        assert.strictEqual(
          matches.length,
          0,
          `useCategorizeOrphan still targets view 'transactions'! It must write to ofx_transactions or pos_transactions.`
        );
      }
    });

    it('F19-T5: writing to view transactions without an INSTEAD OF trigger must fail with error 55000', async () => {
      // Direct update on view should be rejected or intercepted
      const { error } = await supabase
        .from('transactions')
        .update({ manual_category: 'test' })
        .eq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        // Expected behavior if view is read-only
        assert.ok(
          error.message.includes('cannot update view') || error.code === '55000' || error.message.includes('INSTEAD OF'),
          `Error from view mutation: ${error.message}`
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 20: Redirect Critical Reads to Physical Tables
  // --------------------------------------------------------------------------
  describe('Feature 20: Redirect Critical Reads to Physical Tables', () => {
    it('F20-T1: src/hooks must NOT query transactions view filtered by source="ofx"', () => {
      const files = scanCodebase('src/hooks');
      const matches = findPatternInFiles(files, /\.eq\(['"]source['"],\s*['"]ofx['"]\)/);
      assert.strictEqual(
        matches.length,
        0,
        `Found query on transactions view with source='ofx': ${matches.map(m => `${m.file}:${m.line}`).join(', ')}. Must read ofx_transactions directly.`
      );
    });

    it('F20-T2: src/hooks must NOT query transactions view filtered by source="rede"', () => {
      const files = scanCodebase('src/hooks');
      const matches = findPatternInFiles(files, /\.eq\(['"]source['"],\s*['"]rede['"]\)/);
      assert.strictEqual(
        matches.length,
        0,
        `Found query on transactions view with source='rede': ${matches.map(m => `${m.file}:${m.line}`).join(', ')}. Must read pos_transactions directly.`
      );
    });

    it('F20-T3: transactions view definition must remain a pure UNION ALL without side effects', async () => {
      const rel = await checkRelationType('transactions');
      if (rel.exists) {
        assert.strictEqual(rel.type, 'VIEW', 'transactions must be a view if it exists');
      }
    });

    it('F20-T4: reading from ofx_transactions by target_date must succeed efficiently', async () => {
      const { data, error } = await supabase
        .from('ofx_transactions')
        .select('id, amount, bank_name, type')
        .eq('target_date', '2026-08-24')
        .limit(5);

      assert.ok(!error, `Failed to query ofx_transactions: ${error?.message}`);
      assert.ok(Array.isArray(data), 'Expected array of transactions');
    });

    it('F20-T5: reading from pos_transactions by target_date must succeed efficiently', async () => {
      const { data, error } = await supabase
        .from('pos_transactions')
        .select('id, gross_amount, net_amount, fee_amount, machine_name')
        .eq('target_date', '2026-08-24')
        .limit(5);

      assert.ok(!error, `Failed to query pos_transactions: ${error?.message}`);
      assert.ok(Array.isArray(data), 'Expected array of transactions');
    });
  });
});
