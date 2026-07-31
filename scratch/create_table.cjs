const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const projectRef = 'cnwzsvowkfymtdiryhqc';

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

DROP POLICY IF EXISTS "Allow all for ai_execution_logs" ON public.ai_execution_logs;
CREATE POLICY "Allow all for ai_execution_logs" ON public.ai_execution_logs FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
`;

async function apply() {
  console.log('Creating table public.ai_execution_logs...');
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await res.text();
  console.log('Status:', res.status, 'Response:', text);
}

apply();
