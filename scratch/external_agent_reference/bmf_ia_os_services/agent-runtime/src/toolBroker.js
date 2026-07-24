const { query } = require("./db");

/**
 * Tool Broker (C4-DOC-001, Secao 4.2 / BASS Modulo 7)
 * So concede acesso a uma ferramenta se existir uma linha em
 * permissoes_ferramentas para aquele agente com permissao != 'negado'.
 * Um agente Classe D nao consegue, tecnicamente, invocar uma
 * ferramenta de Classe A/B — a permissao simplesmente nao existe.
 */

class FerramentaNaoAutorizadaError extends Error {
  constructor(agenteId, ferramenta) {
    super(`Agente ${agenteId} nao tem permissao para usar a ferramenta "${ferramenta}".`);
    this.name = "FerramentaNaoAutorizadaError";
  }
}

async function solicitar(agenteId, ferramenta) {
  const { rows } = await query(
    `SELECT permissao FROM permissoes_ferramentas WHERE agente_id = $1 AND ferramenta = $2`,
    [agenteId, ferramenta]
  );

  const registro = rows[0];
  if (!registro || registro.permissao === "negado") {
    throw new FerramentaNaoAutorizadaError(agenteId, ferramenta);
  }

  return { concedido: true, permissao: registro.permissao };
}

async function listarFerramentas(agenteId) {
  const { rows } = await query(
    `SELECT ferramenta, permissao FROM permissoes_ferramentas WHERE agente_id = $1`,
    [agenteId]
  );
  return rows;
}

module.exports = { solicitar, listarFerramentas, FerramentaNaoAutorizadaError };
