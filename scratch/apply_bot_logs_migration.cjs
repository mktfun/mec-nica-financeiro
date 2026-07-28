const SUPABASE_ACCESS_TOKEN = "SEU_TOKEN_AQUI";
const PROJECT_REF = "ijomsruroyeaapurnbqu";

const sql = `
-- Tabela de Auditoria do Bot (Dead Letter Queue / Logs)
CREATE TABLE IF NOT EXISTS bot_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning')),
    message TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE bot_audit_logs ENABLE ROW LEVEL SECURITY;

-- Criar política irrestrita para inserção/seleção para simplificar telemetria do bot
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for bot_audit_logs') THEN
    CREATE POLICY "Enable all for bot_audit_logs" ON bot_audit_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
`;

async function run() {
  console.log("🚀 Enviando SQL via Supabase Management API...");
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: sql })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ Erro HTTP:", res.status, err);
      process.exit(1);
    }
    
    console.log("✅ Query enviada com sucesso!");
    const data = await res.json();
    console.log("📄 Resposta:", data);
  } catch (error) {
    console.error("❌ Exceção:", error);
    process.exit(1);
  }
}

run();
