const redis = require("./redis");

/**
 * Priority Queue (C4-DOC-001, Secao 4.1)
 * Fila ordenada por prioridade e SLA, implementada como Redis
 * Sorted Set (DM-DOC-001, Secao 4.3: fila:prioridade:<macrocapacidade>).
 * Score menor = mais prioritário (processado primeiro).
 */

const PESO_PRIORIDADE = { critica: 0, alta: 1, media: 2, baixa: 3 };

async function enfileirar(departamento, tarefaId, prioridade = "media") {
  const chave = `fila:prioridade:${departamento}`;
  const score = (PESO_PRIORIDADE[prioridade] ?? 2) * 1e13 + Date.now();
  await redis.zadd(chave, score, tarefaId);
  return { chave, score };
}

async function proximaTarefa(departamento) {
  const chave = `fila:prioridade:${departamento}`;
  const resultado = await redis.zpopmin(chave, 1);
  return resultado.length ? resultado[0] : null;
}

async function tamanhoFila(departamento) {
  const chave = `fila:prioridade:${departamento}`;
  return redis.zcard(chave);
}

module.exports = { enfileirar, proximaTarefa, tamanhoFila };
