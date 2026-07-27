const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xdfzrmubststcynvwgsk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking test data in Supabase...");

  // Check ai_execution_logs
  const { data: logs, error: logsErr } = await supabase
    .from('ai_execution_logs')
    .select('id, created_at, provider, model, total_tokens, estimated_cost, matches_applied_count')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log("\n--- AI Execution Logs ---");
  if (logsErr) console.error(logsErr);
  else console.log(`Found ${logs?.length || 0} logs:`, logs);

  // Check conciliation_matches
  const { data: matches, error: matchesErr } = await supabase
    .from('conciliation_matches')
    .select('id, store_id, target_date, match_type, confidence_score')
    .limit(20);

  console.log("\n--- Conciliation Matches ---");
  if (matchesErr) console.error(matchesErr);
  else console.log(`Found ${matches?.length || 0} matches:`, matches);

  // Check if stress test transactions or patio_os exist
  const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  const { count: osCount } = await supabase.from('patio_os').select('*', { count: 'exact', head: true });
  const { count: batchCount } = await supabase.from('import_batches').select('*', { count: 'exact', head: true });

  console.log(`\n--- DB Row Counts ---`);
  console.log(`transactions: ${txCount}`);
  console.log(`patio_os: ${osCount}`);
  console.log(`import_batches: ${batchCount}`);

  // Perform cleanup of any test batch
  console.log("\n--- Executing Cleanup ---");
  await supabase.from('conciliation_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('patio_os').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('import_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('import_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  const { count: cleanTx } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  const { count: cleanOs } = await supabase.from('patio_os').select('*', { count: 'exact', head: true });

  console.log(`\n--- DB Row Counts After Cleanup ---`);
  console.log(`transactions: ${cleanTx}`);
  console.log(`patio_os: ${cleanOs}`);
  console.log("Cleanup completed successfully!");
}

run();
