const redis = require("./redis");

/**
 * Event Bus (EA-DOC-002, Secao 5)
 * Redis Streams com consumer groups. Nao e tecnologia nova -- e o
 * mesmo barramento ja definido em DM-DOC-001 (bus:agentes,
 * eventos:<macrocapacidade>), elevado a backbone de coordenacao.
 *
 * Convencao de stream: eventos:workflow
 * Cada mensagem tem os campos: tipo_evento, dados (JSON), timestamp.
 */

const STREAM = "eventos:workflow";
const GROUP = "workflow-engine";

async function garantirGrupo() {
  try {
    await redis.xgroup("CREATE", STREAM, GROUP, "0", "MKSTREAM");
  } catch (err) {
    if (!String(err.message).includes("BUSYGROUP")) throw err;
    // Grupo ja existe -- ok.
  }
}

async function publicar(tipoEvento, dados) {
  const payload = JSON.stringify({ tipo_evento: tipoEvento, dados, timestamp: new Date().toISOString() });
  const id = await redis.xadd(STREAM, "*", "payload", payload);
  return { id, tipoEvento };
}

/**
 * Consome novas mensagens do stream (bloqueante, com timeout).
 * @param {(evento: object, id: string) => Promise<void>} handler
 */
async function consumir(consumerName, handler, { blockMs = 5000, count = 10 } = {}) {
  await garantirGrupo();
  const res = await redis.xreadgroup(
    "GROUP", GROUP, consumerName,
    "COUNT", count,
    "BLOCK", blockMs,
    "STREAMS", STREAM, ">"
  );
  if (!res) return 0;

  const [, mensagens] = res[0];
  let processadas = 0;
  for (const [id, fields] of mensagens) {
    const payloadStr = fields[fields.indexOf("payload") + 1];
    try {
      const evento = JSON.parse(payloadStr);
      await handler(evento, id);
      await redis.xack(STREAM, GROUP, id);
      processadas++;
    } catch (err) {
      console.error(`[event-bus] erro processando ${id}:`, err.message);
      // Nao faz ACK -- mensagem sera reentregue (at-least-once, EA-DOC-002 §5.2)
    }
  }
  return processadas;
}

module.exports = { publicar, consumir, STREAM, GROUP };
