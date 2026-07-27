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

async function verifyTelemetry() {
  const targetDate = '2026-07-24';

  console.log(`====================================================`);
  console.log(`AI Reconciliation & Telemetry Verification Report`);
  console.log(`Target Date: ${targetDate}`);
  console.log(`====================================================\n`);

  // 1. Fetch Active Stores
  const { data: stores, error: sErr } = await supabase
    .from('stores')
    .select('id, name')
    .eq('active', true);

  if (sErr || !stores) {
    console.error('Error fetching stores:', sErr);
    process.exit(1);
  }

  const storeMap = new Map(stores.map(s => [s.id, s.name]));

  // 2. Query conciliation_matches
  const { data: matches, error: mErr } = await supabase
    .from('conciliation_matches')
    .select('*')
    .eq('target_date', targetDate);

  if (mErr) {
    console.error('Error querying conciliation_matches:', mErr);
    process.exit(1);
  }

  console.log(`--- SECTION 1: CONCILIATION MATCHES VERIFICATION ---`);
  console.log(`Total Conciliation Matches Found: ${matches.length}`);

  const matchTypeCounts = {};
  const scoreCounts = {};
  const storeMatchCounts = {};

  matches.forEach(m => {
    matchTypeCounts[m.match_type] = (matchTypeCounts[m.match_type] || 0) + 1;
    scoreCounts[m.confidence_score] = (scoreCounts[m.confidence_score] || 0) + 1;
    storeMatchCounts[m.store_id] = (storeMatchCounts[m.store_id] || 0) + 1;
  });

  console.log(`Matches by Type:`, matchTypeCounts);
  console.log(`Matches by Confidence Score:`, scoreCounts);
  console.log(`Stores with Matches: ${Object.keys(storeMatchCounts).length} / ${stores.length}\n`);

  console.log(`Store ID | Store Name | Matches (>=90%) | TRIPLE_MATCH | REDE_DEPOSIT | PIX_DIRECT`);
  console.log(`---------------------------------------------------------------------------------------------------------`);
  
  for (const s of stores) {
    const storeMatches = matches.filter(m => m.store_id === s.id);
    const tripleCount = storeMatches.filter(m => m.match_type === 'TRIPLE_MATCH').length;
    const redeCount = storeMatches.filter(m => m.match_type === 'REDE_DEPOSIT').length;
    const pixCount = storeMatches.filter(m => m.match_type === 'PIX_DIRECT').length;

    console.log(
      `${s.id.padEnd(36)} | ${(s.name || '').padEnd(20)} | ${String(storeMatches.length).padStart(15)} | ` +
      `${String(tripleCount).padStart(12)} | ${String(redeCount).padStart(12)} | ${String(pixCount).padStart(10)}`
    );
  }

  console.log(`---------------------------------------------------------------------------------------------------------\n`);

  // Sample Matches Detail
  console.log(`Sample Conciliation Matches (First 3):`);
  matches.slice(0, 3).forEach((m, idx) => {
    console.log(`  [Match #${idx + 1}] OS: ${m.system_os_number} | Type: ${m.match_type} | Score: ${m.confidence_score}% | Status: ${m.status} | Store: ${storeMap.get(m.store_id)}`);
    console.log(`              OFX Tx ID: ${m.ofx_transaction_id || 'NULL'} | Rede Tx ID: ${m.rede_transaction_id || 'NULL'}`);
    console.log(`              Notes: ${m.notes || 'N/A'}`);
    console.log(`              Reasoning: "${m.reasoning}"`);
  });
  console.log(`\n`);

  // 3. Query ai_execution_logs
  const storeIds = stores.map(s => s.id);
  const { data: logs, error: lErr } = await supabase
    .from('ai_execution_logs')
    .select('*')
    .in('store_id', storeIds)
    .order('created_at', { ascending: false });

  if (lErr) {
    console.error('Error querying ai_execution_logs:', lErr);
    process.exit(1);
  }

  console.log(`--- SECTION 2: AI EXECUTION TELEMETRY LOGS VERIFICATION ---`);
  console.log(`Total Telemetry Logs Found: ${logs.length}`);

  let grandTotalPromptTokens = 0;
  let grandTotalCompletionTokens = 0;
  let grandTotalTokens = 0;
  let grandTotalCostUSD = 0;
  let grandTotalExecutionTimeMs = 0;

  console.log(`Store ID | Store Name | Provider/Model | Prompt Tokens | Comp Tokens | Total Tokens | Cost (USD) | Cost (BRL) | Time (ms)`);
  console.log(`-------------------------------------------------------------------------------------------------------------------------------`);

  for (const s of stores) {
    const storeLogs = logs.filter(l => l.store_id === s.id);
    const lastLog = storeLogs[0];

    if (lastLog) {
      const pTok = lastLog.prompt_tokens || 0;
      const cTok = lastLog.completion_tokens || 0;
      const tTok = lastLog.total_tokens || 0;
      const costUsd = Number(lastLog.estimated_cost || 0);
      const costBrl = costUsd * 5.60;
      const timeMs = lastLog.execution_time_ms || 0;

      grandTotalPromptTokens += pTok;
      grandTotalCompletionTokens += cTok;
      grandTotalTokens += tTok;
      grandTotalCostUSD += costUsd;
      grandTotalExecutionTimeMs += timeMs;

      console.log(
        `${s.id.padEnd(36)} | ${(s.name || '').padEnd(20)} | ${(lastLog.provider + '/' + lastLog.model).padEnd(22)} | ` +
        `${String(pTok).padStart(13)} | ${String(cTok).padStart(11)} | ${String(tTok).padStart(12)} | ` +
        `$${costUsd.toFixed(6)} | R$ ${costBrl.toFixed(5)} | ${String(timeMs).padStart(8)}ms`
      );
    } else {
      console.log(`${s.id.padEnd(36)} | ${(s.name || '').padEnd(20)} | NO LOG FOUND`);
    }
  }

  const avgExecutionTimeMs = logs.length > 0 ? grandTotalExecutionTimeMs / logs.length : 0;
  const grandTotalCostBRL = grandTotalCostUSD * 5.60;

  console.log(`-------------------------------------------------------------------------------------------------------------------------------`);
  console.log(`TELEMETRY GRAND TOTALS:`);
  console.log(`  - Total Stores Logged: ${logs.length} / ${stores.length}`);
  console.log(`  - Total Prompt Tokens: ${grandTotalPromptTokens.toLocaleString('pt-BR')}`);
  console.log(`  - Total Completion Tokens: ${grandTotalCompletionTokens.toLocaleString('pt-BR')}`);
  console.log(`  - Total Tokens Overall: ${grandTotalTokens.toLocaleString('pt-BR')}`);
  console.log(`  - Total Estimated Cost USD: $${grandTotalCostUSD.toFixed(5)} USD`);
  console.log(`  - Total Estimated Cost BRL: R$ ${grandTotalCostBRL.toFixed(4)} BRL (USD/BRL @ 5.60)`);
  console.log(`  - Average Execution Time: ${avgExecutionTimeMs.toFixed(1)} ms`);
  console.log(`====================================================\n`);

  // Sample Reasoning Logs & Payload Inspection
  if (logs.length > 0) {
    const sampleLog = logs[0];
    console.log(`Sample Telemetry Payload & Reasoning Log (Store: ${storeMap.get(sampleLog.store_id)}):`);
    console.log(`  - Log ID: ${sampleLog.id}`);
    console.log(`  - Matches Applied Count: ${sampleLog.matches_applied_count}`);
    console.log(`  - Reasoning Steps JSON sample:`, JSON.stringify(sampleLog.reasoning_steps_json, null, 2));
    console.log(`  - Raw Payload OS Count: ${sampleLog.raw_payload_json?.os?.length || 0}`);
    console.log(`  - Raw Payload Rede Count: ${sampleLog.raw_payload_json?.rede?.length || 0}`);
    console.log(`  - Raw Payload OFX Count: ${sampleLog.raw_payload_json?.ofx?.length || 0}`);
  }
}

verifyTelemetry().catch(console.error);
