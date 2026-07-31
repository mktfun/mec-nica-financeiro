import https from 'https';

const projectRef = 'cnwzsvowkfymtdiryhqc';
// Use a variável de ambiente ou passe via argumento para não expor no git
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';
if (!accessToken) { console.error('Set SUPABASE_ACCESS_TOKEN env var'); process.exit(1); }

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

async function main() {
  const steps = [
    ['Policy SELECT', `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'import_logs' AND policyname = 'auth_read_import_logs') THEN
          CREATE POLICY auth_read_import_logs ON import_logs FOR SELECT TO authenticated USING (true);
        END IF;
      END $$
    `],
    ['Policy INSERT', `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'import_logs' AND policyname = 'auth_insert_import_logs') THEN
          CREATE POLICY auth_insert_import_logs ON import_logs FOR INSERT TO authenticated WITH CHECK (true);
        END IF;
      END $$
    `],
    ['Policy UPDATE', `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'import_logs' AND policyname = 'auth_update_import_logs') THEN
          CREATE POLICY auth_update_import_logs ON import_logs FOR UPDATE TO authenticated USING (true);
        END IF;
      END $$
    `],
  ];

  for (const [name, sql] of steps) {
    const r = await runSQL(sql);
    console.log(name + ':', r.status, r.body.substring(0, 200));
  }
}

main().catch(console.error);
