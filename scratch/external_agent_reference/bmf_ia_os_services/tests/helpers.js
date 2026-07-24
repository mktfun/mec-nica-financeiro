/**
 * Helpers compartilhados pela suíte de testes automatizada.
 * Assume que os 5 serviços já estão rodando (docker-compose up, ou
 * cada `node src/index.js` local) — esta suíte testa integração real
 * contra HTTP + Postgres + Redis, não mocks.
 */

const BASE = {
  orquestrador: process.env.ORQUESTRADOR_URL || "http://localhost:8080",
  agentRuntime: process.env.AGENT_RUNTIME_URL || "http://localhost:8081",
  integrationHub: process.env.INTEGRATION_HUB_URL || "http://localhost:8082",
  workflowEngine: process.env.WORKFLOW_ENGINE_URL || "http://localhost:8083",
  scheduler: process.env.SCHEDULER_URL || "http://localhost:8084",
  knowledgeBase: process.env.KNOWLEDGE_BASE_URL || "http://localhost:8085",
};

// Cliente de teste criado pelo seed.sql — usado nos cenários de Business Memory.
const CLIENTE_TESTE_ID = "39357839-0d4c-4e76-9fbe-7d12c432e80d";

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Repete `fn` até que retorne um valor "truthy" ou estoure o número
 * de tentativas — usado para esperar efeitos assíncronos reais
 * (ex.: o Workflow Engine retomar uma instância após um evento)
 * sem usar um `sleep` fixo e frágil.
 */
async function aguardarCondicao(fn, { tentativas = 20, intervaloMs = 500, mensagem = "condição" } = {}) {
  for (let i = 0; i < tentativas; i++) {
    const resultado = await fn();
    if (resultado) return resultado;
    await esperar(intervaloMs);
  }
  throw new Error(`Tempo esgotado aguardando: ${mensagem}`);
}

async function jsonOuTexto(res) {
  const texto = await res.text();
  try { return JSON.parse(texto); } catch { return texto; }
}

module.exports = { BASE, CLIENTE_TESTE_ID, esperar, aguardarCondicao, jsonOuTexto };
