const { query } = require("./db");
const redis = require("./redis");

/**
 * Memory Manager (C4-DOC-001, Secao 4.2 / BASS Modulo 10)
 * Permanente e Aprendizado -> PostgreSQL (tabela memoria_agentes)
 * Operacional e Sessao     -> Redis (TTL, DM-DOC-001 Secao 4.3)
 */

const TTL_OPERACIONAL_SEGUNDOS = 60 * 60 * 4; // 4 horas (duracao tipica de uma tarefa)
const TTL_SESSAO_SEGUNDOS = 60 * 60 * 24; // 24 horas de inatividade

async function lerPermanente(agenteId) {
  const { rows } = await query(
    `SELECT conteudo FROM memoria_agentes WHERE agente_id = $1 AND tipo = 'permanente' ORDER BY atualizado_em DESC LIMIT 1`,
    [agenteId]
  );
  return rows[0]?.conteudo || {};
}

async function gravarAprendizado(agenteId, conteudo) {
  await query(
    `INSERT INTO memoria_agentes (agente_id, tipo, conteudo) VALUES ($1, 'aprendizado', $2)`,
    [agenteId, JSON.stringify(conteudo)]
  );
}

async function lerOperacional(agenteId, tarefaId) {
  const chave = `memoria:operacional:${agenteId}:${tarefaId}`;
  const valor = await redis.get(chave);
  return valor ? JSON.parse(valor) : null;
}

async function gravarOperacional(agenteId, tarefaId, contexto) {
  const chave = `memoria:operacional:${agenteId}:${tarefaId}`;
  await redis.set(chave, JSON.stringify(contexto), "EX", TTL_OPERACIONAL_SEGUNDOS);
}

async function lerSessao(agenteId, conversaId) {
  const chave = `memoria:sessao:${agenteId}:${conversaId}`;
  const valor = await redis.get(chave);
  return valor ? JSON.parse(valor) : [];
}

async function adicionarNaSessao(agenteId, conversaId, mensagem) {
  const chave = `memoria:sessao:${agenteId}:${conversaId}`;
  const historico = await lerSessao(agenteId, conversaId);
  historico.push({ ...mensagem, timestamp: new Date().toISOString() });
  await redis.set(chave, JSON.stringify(historico), "EX", TTL_SESSAO_SEGUNDOS);
  return historico;
}

/**
 * Substitui integralmente o historico de sessao — usado pelo Context
 * Compressor apos gerar um resumo, para trocar N mensagens antigas
 * por 1 mensagem de resumo + as mensagens recentes mantidas verbatim.
 */
async function sobrescreverSessao(agenteId, conversaId, historico) {
  const chave = `memoria:sessao:${agenteId}:${conversaId}`;
  await redis.set(chave, JSON.stringify(historico), "EX", TTL_SESSAO_SEGUNDOS);
  return historico;
}

module.exports = {
  lerPermanente,
  gravarAprendizado,
  lerOperacional,
  gravarOperacional,
  lerSessao,
  adicionarNaSessao,
  sobrescreverSessao,
};
