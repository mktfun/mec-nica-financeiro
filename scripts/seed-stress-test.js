import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: Missing Supabase URL or Service Role Key in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function generateBatchTag() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `STRESS_TEST_${year}${month}${day}_${hours}${minutes}${seconds}`;
}

async function runSeed() {
  const batchTag = generateBatchTag();
  const targetDate = '2026-07-24';
  console.log(`====================================================`);
  console.log(`Starting Stress Test Data Insertion`);
  console.log(`Batch Tag: ${batchTag}`);
  console.log(`Target Date: ${targetDate}`);
  console.log(`====================================================\n`);

  // 1. Fetch ALL active stores
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('active', true);

  if (storesError) {
    console.error('ERROR fetching stores:', storesError);
    process.exit(1);
  }

  console.log(`Retrieved ${stores.length} active registered stores.`);
  if (stores.length !== 10) {
    console.warn(`WARNING: Expected 10 active stores, found ${stores.length}.`);
  }

  let totalPatioInserts = 0;
  let totalTxInserts = 0;
  let totalImportLogInserts = 0;
  let totalReconciliationInserts = 0;
  let errorCount = 0;

  const storeMetrics = [];

  for (const store of stores) {
    console.log(`\nProcessing Store: ${store.id} (${store.name})`);

    // Helper for store short ID in OS numbers
    const storeShortId = store.id.length > 10 ? store.id.substring(0, 8) : store.id;

    // Clean up previous stress test records for idempotency
    await supabase.from('patio_os').delete().eq('store_id', store.id).like('os_number', 'STRESS_%');
    await supabase.from('transactions').delete().eq('store_id', store.id).eq('target_date', targetDate).like('title', '%STRESS_TEST%');

    // Build patio_os records
    const patioRecords = [
      // 1. Triple match OS
      {
        os_number: `STRESS_${storeShortId}_TRIPLE_01`,
        store_id: store.id,
        store_name: store.name,
        plate: `STR-1001`,
        total_value: 1850.00,
        paid_value: 1850.00,
        payment_method: 'CARTÃO',
        status: 'finalizado',
        opened_at: `${targetDate}T08:00:00.000Z`,
        closed_at: `${targetDate}T17:00:00.000Z`,
      },
      // 2. Partial match OS + Rede
      {
        os_number: `STRESS_${storeShortId}_PARTIAL_REDE`,
        store_id: store.id,
        store_name: store.name,
        plate: `STR-1002`,
        total_value: 920.00,
        paid_value: 920.00,
        payment_method: 'CARTÃO',
        status: 'finalizado',
        opened_at: `${targetDate}T09:00:00.000Z`,
        closed_at: `${targetDate}T17:00:00.000Z`,
      },
      // 3. Partial match OS + OFX
      {
        os_number: `STRESS_${storeShortId}_PARTIAL_PIX`,
        store_id: store.id,
        store_name: store.name,
        plate: `STR-1003`,
        total_value: 650.00,
        paid_value: 650.00,
        payment_method: 'PIX',
        status: 'finalizado',
        opened_at: `${targetDate}T10:00:00.000Z`,
        closed_at: `${targetDate}T17:00:00.000Z`,
      },
      // 4. Unmatched OS Exception
      {
        os_number: `STRESS_${storeShortId}_UNMATCHED_OS`,
        store_id: store.id,
        store_name: store.name,
        plate: `STR-1004`,
        total_value: 3100.00,
        paid_value: 3100.00,
        payment_method: 'DINHEIRO',
        status: 'em_aberto',
        opened_at: `${targetDate}T11:00:00.000Z`,
      },
    ];

    // Build transactions records
    const txRecords = [
      // Triple match: Rede
      {
        store_id: store.id,
        store_name: store.name,
        source: 'rede',
        amount: 1850.00,
        type: 'in',
        os_number: `STRESS_${storeShortId}_TRIPLE_01`,
        icon_type: batchTag,
        title: `${batchTag} | Venda Rede Card`,
        target_date: targetDate,
        occurred_at: `${targetDate}T10:00:00.000Z`,
      },
      // Triple match: OFX
      {
        store_id: store.id,
        store_name: store.name,
        source: 'ofx',
        amount: 1850.00,
        type: 'in',
        icon_type: batchTag,
        title: `${batchTag} | DEPOSITO REDECARD`,
        target_date: targetDate,
        occurred_at: `${targetDate}T10:05:00.000Z`,
      },
      // Partial Rede: Rede
      {
        store_id: store.id,
        store_name: store.name,
        source: 'rede',
        amount: 920.00,
        type: 'in',
        os_number: `STRESS_${storeShortId}_PARTIAL_REDE`,
        icon_type: batchTag,
        title: `${batchTag} | Venda Rede Card`,
        target_date: targetDate,
        occurred_at: `${targetDate}T11:00:00.000Z`,
      },
      // Partial PIX: OFX
      {
        store_id: store.id,
        store_name: store.name,
        source: 'ofx',
        amount: 650.00,
        type: 'in',
        icon_type: batchTag,
        title: `${batchTag} | PIX RECEBIDO CLIENTE`,
        target_date: targetDate,
        occurred_at: `${targetDate}T12:00:00.000Z`,
      },
      // Unmatched Rede Exception
      {
        store_id: store.id,
        store_name: store.name,
        source: 'rede',
        amount: 410.00,
        type: 'in',
        icon_type: batchTag,
        title: `${batchTag} | Venda Avulsa Maquininha`,
        target_date: targetDate,
        occurred_at: `${targetDate}T14:00:00.000Z`,
      },
      // Unmatched OFX Exception
      {
        store_id: store.id,
        store_name: store.name,
        source: 'ofx',
        amount: 1250.00,
        type: 'in',
        icon_type: batchTag,
        title: `${batchTag} | DEPOSITO DINHEIRO`,
        target_date: targetDate,
        occurred_at: `${targetDate}T15:00:00.000Z`,
      },
    ];

    // Build import_log entry
    const importLogRecord = {
      store_id: store.id,
      store_name: store.name,
      target_date: targetDate,
      total_os: 6520.00,
      total_paid_all: 3420.00,
      total_dinheiro: 0.00,
      os_count: 4,
      receivables_count: 2,
    };

    // Build reconciliation entry
    const reconciliationRecord = {
      store_id: store.id,
      date: targetDate,
      os_total: 6520.00,
      financial_total: 3420.00,
      divergence: 3100.00,
      daily_cash: 0.00,
      os_count: 4,
      status: 'pending',
      top_error: batchTag,
    };

    // Insert patio_os
    const { data: patioData, error: patioErr } = await supabase
      .from('patio_os')
      .insert(patioRecords)
      .select('id');

    if (patioErr) {
      console.error(`  [ERROR] patio_os insert failed for store ${store.id}:`, patioErr.message);
      errorCount++;
    } else {
      console.log(`  [OK] patio_os inserted: ${patioData.length} rows`);
      totalPatioInserts += patioData.length;
    }

    // Insert transactions
    const { data: txData, error: txErr } = await supabase
      .from('transactions')
      .insert(txRecords)
      .select('id');

    if (txErr) {
      console.error(`  [ERROR] transactions insert failed for store ${store.id}:`, txErr.message);
      errorCount++;
    } else {
      console.log(`  [OK] transactions inserted: ${txData.length} rows`);
      totalTxInserts += txData.length;
    }

    // Insert/Upsert import_logs
    const { data: logData, error: logErr } = await supabase
      .from('import_logs')
      .upsert([importLogRecord], { onConflict: 'store_id,target_date' })
      .select('id');

    if (logErr) {
      console.error(`  [ERROR] import_logs insert failed for store ${store.id}:`, logErr.message);
      errorCount++;
    } else {
      console.log(`  [OK] import_logs inserted/upserted: ${logData.length} row`);
      totalImportLogInserts += logData.length;
    }

    // Insert/Upsert reconciliations
    const { data: recData, error: recErr } = await supabase
      .from('reconciliations')
      .upsert([reconciliationRecord], { onConflict: 'store_id,date' })
      .select('id');

    if (recErr) {
      console.error(`  [ERROR] reconciliations insert failed for store ${store.id}:`, recErr.message);
      errorCount++;
    } else {
      console.log(`  [OK] reconciliations inserted/upserted: ${recData.length} row`);
      totalReconciliationInserts += recData.length;
    }

    storeMetrics.push({
      storeId: store.id,
      storeName: store.name,
      patioCount: patioData ? patioData.length : 0,
      txCount: txData ? txData.length : 0,
      importLogCount: logData ? logData.length : 0,
      reconciliationCount: recData ? recData.length : 0,
    });
  }

  console.log(`\n====================================================`);
  console.log(`STRESS TEST SEEDING COMPLETE`);
  console.log(`Batch Tag: ${batchTag}`);
  console.log(`Total Active Stores Processed: ${stores.length}`);
  console.log(`Total patio_os Inserted: ${totalPatioInserts}`);
  console.log(`Total transactions Inserted: ${totalTxInserts}`);
  console.log(`Total import_logs Inserted: ${totalImportLogInserts}`);
  console.log(`Total reconciliations Inserted: ${totalReconciliationInserts}`);
  console.log(`Total Database Errors Encountered: ${errorCount}`);
  console.log(`====================================================\n`);

  if (errorCount > 0) {
    console.error(`Seeding completed with ${errorCount} errors!`);
    process.exit(1);
  }
}

runSeed().catch((err) => {
  console.error('Unhandled seed script error:', err);
  process.exit(1);
});
