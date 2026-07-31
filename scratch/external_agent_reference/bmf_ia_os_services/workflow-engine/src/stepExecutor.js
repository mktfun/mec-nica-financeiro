const fetch = require("node-fetch");

/**
 * Step Executor (EA-DOC-002, Secao 4)
 * Um step de workflow nunca chama um conector diretamente -- sempre
 * passa pela Skill correspondente, que por sua vez usa o Tool Broker
 * e o Connector Registry ja existentes (Agent Runtime / Integration Hub).
 */

const AGENT_RUNTIME_URL = process.env.AGENT_RUNTIME_URL || "http://localhost:8081";
const INTEGRATION_HUB_URL = process.env.INTEGRATION_HUB_URL || "http://localhost:8082";

async function executarStep(step, contexto) {
  switch (step.tipo) {
    case "agent": {
      // Delega a um agente executivo (Agent Runtime) -- passa pelo
      // Homologation Gate e Tool Broker automaticamente (C4-DOC-001 §4.2)
      const resp = await fetch(`${AGENT_RUNTIME_URL}/agents/${step.alvo}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objetivo: step.objetivo || step.nome, tarefaId: `wf_${Date.now()}` }),
      });
      return resp.json();
    }
    case "connector":
    case "tool": {
      // Ambos passam pelo Connector Registry do Integration Hub por
      // enquanto -- a distincao Tool/Connector (EA-DOC-002 §6) e
      // conceitual; endpoints dedicados de Tool ficam para o backlog.
      const resp = await fetch(`${INTEGRATION_HUB_URL}/integrations/${step.alvo}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: step.acao || step.nome, payload: { ...contexto, ...step.payload } }),
      });
      return resp.json();
    }
    case "wait":
      // Nao executa nada -- o motor cria um workflow_waits e para aqui.
      return { aguardando: step.aguardando_evento };
    default:
      throw new Error(`Tipo de step desconhecido: ${step.tipo}`);
  }
}

module.exports = { executarStep };
