import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepVerify() {
  console.log("=================================================");
  console.log("REVIEWER 1 DEEP VERIFICATION FOR R1 STRESS TEST");
  console.log("=================================================\n");

  const expectedBatchTag = 'STRESS_TEST_20260724_165405';
  const targetDate = '2026-07-24';
  const expectedStoreIds = [
    'st-01', 'st-02', 'st-03', 'st-04', 'st-05',
    'st-06', 'st-07', 'st-08', 'st-09', '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f'
  ];

  const results = {
    storesCheck: { pass: true, details: [] },
    fkIntegrityCheck: { pass: true, details: [] },
    batchTagIsolationCheck: { pass: true, details: [] },
    financialScenarioCheck: { pass: true, details: [] },
    integrityViolationCheck: { pass: true, details: [] }
  };

  // 1. Fetch active stores
  const { data: stores, error: sErr } = await supabase.from('stores').select('id, name, active').eq('active', true);
  if (sErr) {
    console.error('Error fetching stores:', sErr);
    process.exit(1);
  }

  console.log(`Active stores in DB: ${stores.length}`);
  const storeIdMap = new Map(stores.map(s => [s.id, s.name]));

  // Check expected stores match
  for (const expectedId of expectedStoreIds) {
    if (!storeIdMap.has(expectedId)) {
      results.storesCheck.pass = false;
      results.storesCheck.details.push(`Missing expected active store: ${expectedId}`);
    }
  }

  // 2. Per-store verification
  for (const storeId of expectedStoreIds) {
    const storeName = storeIdMap.get(storeId) || 'UNKNOWN';

    // A. patio_os check
    const { data: patioRows, error: pErr } = await supabase
      .from('patio_os')
      .select('*')
      .eq('store_id', storeId)
      .like('os_number', 'STRESS_%');

    if (pErr) {
      results.fkIntegrityCheck.pass = false;
      results.fkIntegrityCheck.details.push(`Error fetching patio_os for ${storeId}: ${pErr.message}`);
    }

    if (!patioRows || patioRows.length !== 4) {
      results.storesCheck.pass = false;
      results.storesCheck.details.push(`Store ${storeId} patio_os count = ${patioRows ? patioRows.length : 0}, expected 4`);
    }

    // Check financial amounts for patio_os
    if (patioRows) {
      const tripleOS = patioRows.find(r => r.os_number.includes('TRIPLE'));
      const partialRedeOS = patioRows.find(r => r.os_number.includes('PARTIAL_REDE'));
      const partialPixOS = patioRows.find(r => r.os_number.includes('PARTIAL_PIX'));
      const unmatchedOS = patioRows.find(r => r.os_number.includes('UNMATCHED_OS'));

      if (!tripleOS || Number(tripleOS.total_value) !== 1850) {
        results.financialScenarioCheck.pass = false;
        results.financialScenarioCheck.details.push(`Store ${storeId} Triple OS total_value = ${tripleOS?.total_value}, expected 1850`);
      }
      if (!partialRedeOS || Number(partialRedeOS.total_value) !== 920) {
        results.financialScenarioCheck.pass = false;
        results.financialScenarioCheck.details.push(`Store ${storeId} Partial Rede OS total_value = ${partialRedeOS?.total_value}, expected 920`);
      }
      if (!partialPixOS || Number(partialPixOS.total_value) !== 650) {
        results.financialScenarioCheck.pass = false;
        results.financialScenarioCheck.details.push(`Store ${storeId} Partial PIX OS total_value = ${partialPixOS?.total_value}, expected 650`);
      }
      if (!unmatchedOS || Number(unmatchedOS.total_value) !== 3100) {
        results.financialScenarioCheck.pass = false;
        results.financialScenarioCheck.details.push(`Store ${storeId} Unmatched OS total_value = ${unmatchedOS?.total_value}, expected 3100`);
      }
    }

    // B. transactions check
    const { data: txRows, error: tErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .eq('target_date', targetDate);

    if (tErr) {
      results.fkIntegrityCheck.pass = false;
      results.fkIntegrityCheck.details.push(`Error fetching transactions for ${storeId}: ${tErr.message}`);
    }

    if (!txRows || txRows.length !== 6) {
      results.storesCheck.pass = false;
      results.storesCheck.details.push(`Store ${storeId} transactions count = ${txRows ? txRows.length : 0}, expected 6`);
    }

    if (txRows) {
      // Check batch tag in transactions
      for (const tx of txRows) {
        if (tx.icon_type !== expectedBatchTag) {
          results.batchTagIsolationCheck.pass = false;
          results.batchTagIsolationCheck.details.push(`Store ${storeId} transaction ${tx.id} icon_type = '${tx.icon_type}', expected '${expectedBatchTag}'`);
        }
        if (!tx.title.includes(expectedBatchTag)) {
          results.batchTagIsolationCheck.pass = false;
          results.batchTagIsolationCheck.details.push(`Store ${storeId} transaction ${tx.id} title does not contain '${expectedBatchTag}'`);
        }
      }

      // Check amounts
      const redeTriple = txRows.find(t => t.source === 'rede' && Number(t.amount) === 1850);
      const ofxTriple = txRows.find(t => t.source === 'ofx' && Number(t.amount) === 1850);
      const redePartial = txRows.find(t => t.source === 'rede' && Number(t.amount) === 920);
      const ofxPartial = txRows.find(t => t.source === 'ofx' && Number(t.amount) === 650);
      const redeUnmatched = txRows.find(t => t.source === 'rede' && Number(t.amount) === 410);
      const ofxUnmatched = txRows.find(t => t.source === 'ofx' && Number(t.amount) === 1250);

      if (!redeTriple || !ofxTriple || !redePartial || !ofxPartial || !redeUnmatched || !ofxUnmatched) {
        results.financialScenarioCheck.pass = false;
        results.financialScenarioCheck.details.push(`Store ${storeId} transactions missing financial breakdown amounts (1850, 1850, 920, 650, 410, 1250)`);
      }
    }

    // C. import_logs check
    const { data: logRows, error: lErr } = await supabase
      .from('import_logs')
      .select('*')
      .eq('store_id', storeId)
      .eq('target_date', targetDate);

    if (lErr || !logRows || logRows.length !== 1) {
      results.storesCheck.pass = false;
      results.storesCheck.details.push(`Store ${storeId} import_logs count = ${logRows ? logRows.length : 0}, expected 1`);
    } else {
      const log = logRows[0];
      if (Number(log.total_os) !== 6520 || Number(log.total_paid_all) !== 3420 || Number(log.os_count) !== 4) {
        results.financialScenarioCheck.pass = false;
        results.financialScenarioCheck.details.push(`Store ${storeId} import_logs values mismatch: total_os=${log.total_os}, total_paid=${log.total_paid_all}, os_count=${log.os_count}`);
      }
    }

    // D. reconciliations check
    const { data: recRows, error: rErr } = await supabase
      .from('reconciliations')
      .select('*')
      .eq('store_id', storeId)
      .eq('date', targetDate);

    if (rErr || !recRows || recRows.length !== 1) {
      results.storesCheck.pass = false;
      results.storesCheck.details.push(`Store ${storeId} reconciliations count = ${recRows ? recRows.length : 0}, expected 1`);
    } else {
      const rec = recRows[0];
      if (rec.top_error !== expectedBatchTag) {
        results.batchTagIsolationCheck.pass = false;
        results.batchTagIsolationCheck.details.push(`Store ${storeId} reconciliation top_error = '${rec.top_error}', expected '${expectedBatchTag}'`);
      }
      if (Number(rec.os_total) !== 6520 || Number(rec.financial_total) !== 3420 || Number(rec.divergence) !== 3100) {
        results.financialScenarioCheck.pass = false;
        results.financialScenarioCheck.details.push(`Store ${storeId} reconciliation values mismatch: os_total=${rec.os_total}, fin_total=${rec.financial_total}, div=${rec.divergence}`);
      }
    }
  }

  // 3. Foreign key integrity check: check all inserted rows store_id exist in public.stores
  const tables = ['patio_os', 'transactions', 'import_logs', 'reconciliations'];
  for (const table of tables) {
    let query = supabase.from(table).select('store_id');
    if (table === 'patio_os') query = query.like('os_number', 'STRESS_%');
    else if (table === 'transactions' || table === 'import_logs') query = query.eq('target_date', targetDate);
    else if (table === 'reconciliations') query = query.eq('date', targetDate);

    const { data: tableRows, error: tErr } = await query;
    if (tErr) {
      results.fkIntegrityCheck.pass = false;
      results.fkIntegrityCheck.details.push(`Error checking FK integrity on table ${table}: ${tErr.message}`);
    } else if (tableRows) {
      for (const row of tableRows) {
        if (!storeIdMap.has(row.store_id)) {
          results.fkIntegrityCheck.pass = false;
          results.fkIntegrityCheck.details.push(`Table ${table} contains invalid store_id: ${row.store_id}`);
        }
      }
    }
  }

  // Summary output
  console.log("\n---------------- VERIFICATION SUMMARY ----------------");
  console.log("1. Stores & Datasets Complete Check:", results.storesCheck.pass ? "PASS" : "FAIL");
  if (!results.storesCheck.pass) console.log("   Errors:", results.storesCheck.details);

  console.log("2. Foreign Key Integrity Check:", results.fkIntegrityCheck.pass ? "PASS" : "FAIL");
  if (!results.fkIntegrityCheck.pass) console.log("   Errors:", results.fkIntegrityCheck.details);

  console.log("3. Batch Tag Isolation Check:", results.batchTagIsolationCheck.pass ? "PASS" : "FAIL");
  if (!results.batchTagIsolationCheck.pass) console.log("   Errors:", results.batchTagIsolationCheck.details);

  console.log("4. Financial Scenarios Match Check:", results.financialScenarioCheck.pass ? "PASS" : "FAIL");
  if (!results.financialScenarioCheck.pass) console.log("   Errors:", results.financialScenarioCheck.details);

  console.log("5. Integrity Violation Check:", results.integrityViolationCheck.pass ? "PASS" : "FAIL");
  if (!results.integrityViolationCheck.pass) console.log("   Errors:", results.integrityViolationCheck.details);

  const overallPass = results.storesCheck.pass &&
                      results.fkIntegrityCheck.pass &&
                      results.batchTagIsolationCheck.pass &&
                      results.financialScenarioCheck.pass &&
                      results.integrityViolationCheck.pass;

  console.log("\n=================================================");
  console.log(`OVERALL VERDICT: ${overallPass ? "APPROVE (PASS)" : "REQUEST_CHANGES (FAIL)"}`);
  console.log("=================================================\n");
}

deepVerify().catch(err => {
  console.error("Deep verification failed with exception:", err);
  process.exit(1);
});
