const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const projectRef = 'cnwzsvowkfymtdiryhqc';

const sql = `
CREATE TABLE IF NOT EXISTS public.ai_settings (
  user_id TEXT PRIMARY KEY,
  provider TEXT DEFAULT 'google',
  model TEXT DEFAULT 'gemini-2.0-flash',
  api_key TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for ai_settings" ON public.ai_settings;
CREATE POLICY "Allow all for ai_settings" ON public.ai_settings FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
`;

async function apply() {
  console.log('Ensuring table public.ai_settings...');
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
