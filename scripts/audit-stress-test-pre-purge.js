import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: Missing Supabase URL or Service Role Key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  const targetDate = '2026-07-24';
  const batchId = 'STRESS_TEST_20260724_165405';

  console.log(`=================================================================`);
  console.log(`FORENSIC INTEGRITY AUDIT: BATCH ${batchId} / TARGET DATE: ${targetDate}`);
  console.log(`=================================================================\n`);

  // 1. STORES AUDIT
  const { data: stores, error: sErr } = await supabase.from('stores').select('*').eq('active', true);
  if (sErr) throw sErr;
  console.log(`[CHECK 1] Active Stores Count: ${stores.length}`);
  const storeIds = stores.map(s => s.id);
  const storeMap = new Map(stores.map(s => [s.id, s.name]));

  // 2. BATCH DATA INSPECTION (patio_os, transactions, import_logs, reconciliations)
  console.log(`\n--- [CHECK 2] BATCH DATA INSPECTION ---`);
  
  // patio_os
  const { data: patioData, error: pErr } = await supabase
    .from('patio_os')
    .select('*')
    .like('os_number', 'STRESS_%');
  if (pErr) throw pErr;
  
  const { data: patioDateData, error: pdErr } = await supabase
    .from('patio_os')
    .select('*')
    .in('store_id', storeIds);
  if (pdErr) throw pdErr;

  console.log(`  patio_os matching STRESS_%: ${patioData.length}`);
  console.log(`  patio_os total for active stores: ${patioDateData.length}`);

  // transactions
  const { data: txData, error: tErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('target_date', targetDate);
  if (tErr) throw tErr;
  console.log(`  transactions for target_date ${targetDate}: ${txData.length}`);

  // import_logs
  const { data: logData, error: lErr } = await supabase
    .from('import_logs')
    .select('*')
    .eq('target_date', targetDate);
  if (lErr) throw lErr;
  console.log(`  import_logs for target_date ${targetDate}: ${logData.length}`);

  // reconciliations
  const { data: recData, error: rErr } = await supabase
    .from('reconciliations')
    .select('*')
    .eq('date', targetDate);
  if (rErr) throw rErr;
  console.log(`  reconciliations for date ${targetDate}: ${recData.length}`);

  // Breakdown per store for Batch Data
  console.log(`\n  Store-by-Store Batch Record Distribution:`);
  console.log(`  Store ID | Store Name | patio_os | transactions | import_logs | reconciliations`);
  console.log(`  -----------------------------------------------------------------------------------`);
  for (const s of stores) {
    const pCount = patioData.filter(p => p.store_id === s.id).length;
    const tCount = txData.filter(t => t.store_id === s.id).length;
    const lCount = logData.filter(l => l.store_id === s.id).length;
    const rCount = recData.filter(r => r.store_id === s.id).length;
    console.log(`  ${s.id.padEnd(36)} | ${(s.name || '').padEnd(20)} | ${String(pCount).padStart(8)} | ${String(tCount).padStart(12)} | ${String(lCount).padStart(11)} | ${String(rCount).padStart(15)}`);
  }

  // 3. CONCILIATION MATCHES FORENSIC VERIFICATION (Target: 30 matches with confidence score >= 90%)
  console.log(`\n--- [CHECK 3] CONCILIATION MATCHES VERIFICATION ---`);
  const { data: matches, error: mErr } = await supabase
    .from('conciliation_matches')
    .select('*')
    .eq('target_date', targetDate);
  if (mErr) throw mErr;

  console.log(`  Total conciliation_matches found for ${targetDate}: ${matches.length}`);

  const matchesScore90Plus = matches.filter(m => m.confidence_score >= 90);
  console.log(`  Matches with confidence_score >= 90%: ${matchesScore90Plus.length}`);

  const matchesLessThan90 = matches.filter(m => m.confidence_score < 90);
  console.log(`  Matches with confidence_score < 90%: ${matchesLessThan90.length}`);

  console.log(`\n  Match Type Breakdown:`);
  const matchTypes = {};
  matches.forEach(m => {
    matchTypes[m.match_type] = (matchTypes[m.match_type] || 0) + 1;
  });
  console.log(`  ${JSON.stringify(matchTypes, null, 2)}`);

  console.log(`\n  Confidence Score Breakdown:`);
  const scoreMap = {};
  matches.forEach(m => {
    scoreMap[m.confidence_score] = (scoreMap[m.confidence_score] || 0) + 1;
  });
  console.log(`  ${JSON.stringify(scoreMap, null, 2)}`);

  console.log(`\n  Sample Conciliation Matches (All ${matches.length}):`);
  matches.forEach((m, idx) => {
    console.log(`  [Match #${String(idx + 1).padStart(2)}] ID: ${m.id} | OS: ${m.system_os_number || m.os_number} | Type: ${m.match_type} | Score: ${m.confidence_score}% | Store: ${storeMap.get(m.store_id)}`);
    console.log(`               Reasoning: "${m.reasoning}"`);
    console.log(`               OS ID: ${m.patio_os_id || 'N/A'} | Tx ID: ${m.transaction_id || 'N/A'}`);
  });

  // 4. AI EXECUTION LOGS FORENSIC VERIFICATION (Target: 10 telemetry records with non-zero tokens, USD/BRL cost calculation, reasoning logs)
  console.log(`\n--- [CHECK 4] AI EXECUTION LOGS (TELEMETRY) VERIFICATION ---`);
  const { data: aiLogs, error: aiErr } = await supabase
    .from('ai_execution_logs')
    .select('*')
    .in('store_id', storeIds)
    .order('created_at', { ascending: false });
  if (aiErr) throw aiErr;

  console.log(`  Total ai_execution_logs found: ${aiLogs.length}`);

  let zeroTokenLogsCount = 0;
  let nonZeroTokenLogsCount = 0;
  let missingReasoningCount = 0;

  aiLogs.forEach((l, idx) => {
    const pTok = l.prompt_tokens || 0;
    const cTok = l.completion_tokens || 0;
    const tTok = l.total_tokens || 0;
    const costUsd = Number(l.estimated_cost || 0);
    const costBrl = costUsd * 5.60;

    if (tTok === 0 || pTok === 0 || cTok === 0) {
      zeroTokenLogsCount++;
    } else {
      nonZeroTokenLogsCount++;
    }

    const hasReasoning = l.reasoning_steps_json && (
      (Array.isArray(l.reasoning_steps_json) && l.reasoning_steps_json.length > 0) ||
      (typeof l.reasoning_steps_json === 'object' && Object.keys(l.reasoning_steps_json).length > 0)
    );
    if (!hasReasoning) missingReasoningCount++;

    console.log(`  [AI Log #${String(idx + 1).padStart(2)}] Store: ${storeMap.get(l.store_id) || l.store_id}`);
    console.log(`              Provider/Model: ${l.provider}/${l.model} | Created: ${l.created_at}`);
    console.log(`              Tokens: Prompt=${pTok}, Comp=${cTok}, Total=${tTok}`);
    console.log(`              Cost: $${costUsd.toFixed(6)} USD / R$ ${costBrl.toFixed(5)} BRL`);
    console.log(`              Execution Time: ${l.execution_time_ms} ms`);
    console.log(`              Matches Applied: ${l.matches_applied_count}`);
    console.log(`              Reasoning Steps JSON: ${JSON.stringify(l.reasoning_steps_json)}`);
  });

  console.log(`\n  AI Telemetry Audit Summary:`);
  console.log(`  - Total Telemetry Records: ${aiLogs.length}`);
  console.log(`  - Non-Zero Token Records: ${nonZeroTokenLogsCount}`);
  console.log(`  - Zero Token Records: ${zeroTokenLogsCount}`);
  console.log(`  - Missing Reasoning Records: ${missingReasoningCount}`);

  // 5. FOREIGN KEY INTEGRITY & DUMMY DATA CORRUPTION CHECKS
  console.log(`\n--- [CHECK 5] FOREIGN KEY & DATA INTEGRITY CHECKS ---`);

  const storeIdSet = new Set(storeIds);
  const orphanMatchesStore = matches.filter(m => !storeIdSet.has(m.store_id));
  console.log(`  Orphan conciliation_matches (invalid store_id): ${orphanMatchesStore.length}`);

  let orphanMatchesOS = 0;
  if (patioDateData.length > 0) {
    const patioIdSet = new Set(patioDateData.map(p => p.id));
    orphanMatchesOS = matches.filter(m => m.patio_os_id && !patioIdSet.has(m.patio_os_id)).length;
  }
  console.log(`  Orphan conciliation_matches (invalid patio_os_id): ${orphanMatchesOS}`);

  let orphanMatchesTx = 0;
  if (txData.length > 0) {
    const txIdSet = new Set(txData.map(t => t.id));
    orphanMatchesTx = matches.filter(m => m.transaction_id && !txIdSet.has(m.transaction_id)).length;
  }
  console.log(`  Orphan conciliation_matches (invalid transaction_id): ${orphanMatchesTx}`);

  const orphanLogsStore = aiLogs.filter(l => !storeIdSet.has(l.store_id));
  console.log(`  Orphan ai_execution_logs (invalid store_id): ${orphanLogsStore.length}`);

  const corruptPatio = patioData.filter(p => !p.os_number || !p.store_id);
  console.log(`  Corrupt patio_os records (missing os_number or store_id): ${corruptPatio.length}`);

  const corruptTx = txData.filter(t => t.amount === null || t.amount === undefined || !t.store_id);
  console.log(`  Corrupt transactions records: ${corruptTx.length}`);

  console.log(`\n=================================================================`);
  console.log(`AUDIT COMPLETE.`);
  console.log(`=================================================================`);
}

runAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
