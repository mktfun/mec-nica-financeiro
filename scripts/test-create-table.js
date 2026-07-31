import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || 'cnwzsvowkfymtdiryhqc';
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
    CREATE TABLE IF NOT EXISTS public.claritas_prompts (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      agent_role text NOT NULL,
      content text NOT NULL,
      version text NOT NULL DEFAULT '1.0',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.claritas_policies (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      policy_name text NOT NULL,
      rule_definition text NOT NULL,
      severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.agent_reflections (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
      tool_used text,
      outcome_success boolean NOT NULL,
      reflection_notes text NOT NULL,
      policy_evaluations jsonb,
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.claritas_prompts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.claritas_policies ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.agent_reflections ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'claritas_prompts' AND policyname = 'claritas_prompts_allow') THEN
        CREATE POLICY claritas_prompts_allow ON public.claritas_prompts FOR ALL USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'claritas_policies' AND policyname = 'claritas_policies_allow') THEN
        CREATE POLICY claritas_policies_allow ON public.claritas_policies FOR ALL USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_reflections' AND policyname = 'agent_reflections_allow') THEN
        CREATE POLICY agent_reflections_allow ON public.agent_reflections FOR ALL USING (true);
      END IF;
    END $$;

    INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge_graph', 'knowledge_graph', false) ON CONFLICT DO NOTHING;

    INSERT INTO public.claritas_prompts (agent_role, content, version, is_active)
    VALUES (
      'oficina_gpt',
      'Você é o Oficina GPT, Agente de I.A. Central da rede de oficinas ConciliaMec. Responda com precisão aos dados financeiros e operacionais das ordens de serviço.',
      '1.0',
      true
    ) ON CONFLICT DO NOTHING;

    INSERT INTO public.claritas_policies (policy_name, rule_definition, severity)
    VALUES 
      ('Zero Alucinação em OS', 'NUNCA invente dados de OS. Se a OS não for encontrada localmente ou via API externa, informe explicitamente que não foi localizada.', 'critical'),
      ('Identificação Obrigatória de Loja', 'Exija a especificação da loja antes de buscar dados detalhados ou de contas a pagar.', 'high'),
      ('Relatório Auditável de Grafo', 'Toda resposta gerada com busca no conhecimento estruturado deve incluir o caminho percorrido no grafo (caminho do grafo).', 'medium')
    ON CONFLICT DO NOTHING;
  `;
  const res = await runSQL(sql);
  console.log('SQL Exec result:', res);
}

testSql();
