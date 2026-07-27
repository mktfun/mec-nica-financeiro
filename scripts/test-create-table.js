import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const projectRef = 'cnwzsvowkfymtdiryhqc';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';

console.log('SUPABASE_ACCESS_TOKEN exists?', !!accessToken);

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testSql() {
  if (!accessToken) {
    console.log('No ACCESS TOKEN available');
    return;
  }
  const sql = `
    CREATE TABLE IF NOT EXISTS public.ai_execution_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT now(),
      store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      estimated_cost NUMERIC(10, 6) DEFAULT 0,
      execution_time_ms INTEGER DEFAULT 0,
      raw_payload_json JSONB,
      raw_response_json JSONB,
      reasoning_steps_json JSONB,
      matches_applied_count INTEGER DEFAULT 0
    );

    ALTER TABLE public.ai_execution_logs ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_execution_logs' AND policyname = 'ai_execution_logs_allow_all') THEN
        CREATE POLICY ai_execution_logs_allow_all ON public.ai_execution_logs FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;

    ALTER TABLE public.conciliation_matches ADD COLUMN IF NOT EXISTS match_type TEXT;
    ALTER TABLE public.conciliation_matches ADD COLUMN IF NOT EXISTS confidence_score INTEGER;
    ALTER TABLE public.conciliation_matches ADD COLUMN IF NOT EXISTS reasoning TEXT;
    ALTER TABLE public.conciliation_matches ADD COLUMN IF NOT EXISTS notes TEXT;
  `;
  const res = await runSQL(sql);
  console.log('SQL Exec result:', res);
}

testSql();
