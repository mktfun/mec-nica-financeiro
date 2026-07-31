const fs = require('fs');
const path = require('path');
require('dotenv').config();

const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || 'cnwzsvowkfymtdiryhqc';
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '../supabase/migrations/20260730000000_ias_claritas_graphify.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function runSql(querySql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: querySql })
  });

  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
  return { status: response.status, text };
}

async function main() {
  console.log('--- Applying Migration 20260730000000_ias_claritas_graphify.sql ---');
  await runSql(sql);

  console.log('--- Seeding Claritas Prompts & Policies ---');
  const seedSql = `
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
  await runSql(seedSql);
}

main();
