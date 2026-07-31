const { query } = require("./db");
const redis = require("./redis");

/**
 * Audit Logger (C4-DOC-001, Secao 4.2 / BASS Modulo 14)
 * Grava um registro estruturado por execucao, tanto na tabela
 * auditoria (fonte de verdade, retencao 5 anos) quanto no stream
 * Redis bus:agentes / eventos:<macrocapacidade>, conforme
 * DM-DOC-001 Secao 4.
 */

async function registrar({ agenteId, colaboradorId, ferramenta, objetivo, resultado, tempoExecucaoMs, status }) {
  await query(
    `INSERT INTO auditoria (agente_id, colaborador_id, ferramenta, objetivo, resultado, tempo_execucao_ms, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [agenteId, colaboradorId || null, ferramenta || null, objetivo, resultado, tempoExecucaoMs, status]
  );
}

async function publicarEventoDominio(macrocapacidade, tipoEvento, entidade, entidadeId, dados, origemAgente) {
  const evento = {
    tipo_evento: tipoEvento,
    entidade,
    entidade_id: entidadeId,
    dados,
    origem_agente: origemAgente,
    timestamp: new Date().toISOString(),
  };
  await redis.xadd(`eventos:${macrocapacidade}`, "*", "payload", JSON.stringify(evento));
  return evento;
}

module.exports = { registrar, publicarEventoDominio };
