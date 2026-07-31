const redis = require("./redis");

/**
 * Webhook Receiver (C4-DOC-002, Secao 2)
 * Recebe callbacks assincronos de sistemas externos e publica
 * como evento de dominio (DM-DOC-001, Secao 4.2) para quem
 * precisar reagir (ex.: CIO IA, CGO IA, dashboards).
 */

async function receber(origem, payload) {
  const evento = {
    tipo_evento: `webhook.${origem}.recebido`,
    entidade: origem,
    dados: payload,
    origem_agente: "integration-hub",
    timestamp: new Date().toISOString(),
  };
  await redis.xadd(`eventos:integracoes`, "*", "payload", JSON.stringify(evento));
  return evento;
}

module.exports = { receber };
