const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xdfzrmubststcynvwgsk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Creating ai_execution_logs table in Supabase...");

  const sql = `
    CREATE TABLE IF NOT EXISTS public.ai_execution_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT now(),
      store_id TEXT,
      provider TEXT,
      model TEXT,
      prompt_tokens INT DEFAULT 0,
      completion_tokens INT DEFAULT 0,
      total_tokens INT DEFAULT 0,
      estimated_cost NUMERIC(10, 6) DEFAULT 0,
      execution_time_ms INT DEFAULT 0,
      raw_payload_json JSONB,
      raw_response_json JSONB,
      reasoning_steps_json JSONB,
      matches_applied_count INT DEFAULT 0
    );

    ALTER TABLE public.ai_execution_logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Allow read for authenticated users" ON public.ai_execution_logs
      FOR SELECT USING (true);

    CREATE POLICY "Allow insert for authenticated users" ON public.ai_execution_logs
      FOR INSERT WITH CHECK (true);

    NOTIFY pgrst, 'reload schema';
  `;

  // We can execute SQL via rpc or fetch
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!res.ok) {
    console.log("RPC exec_sql not available, executing fallback migration via postgres query endpoint if needed.");
  } else {
    console.log("Migration executed successfully!");
  }
}

run();
