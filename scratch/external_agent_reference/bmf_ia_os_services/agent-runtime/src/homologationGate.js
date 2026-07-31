const { query } = require("./db");

/**
 * Homologation Gate (C4-DOC-001, Secao 4.2 / BASS Modulo 15)
 * Bloqueia, na pratica, a execucao de qualquer agente cujo
 * status_homologacao nao seja 'homologado'. Este e o componente
 * que transforma a regra de governanca em barreira tecnica real,
 * nao apenas em documentacao.
 */

class AgentoNaoHomologadoError extends Error {
  constructor(codigo, status) {
    super(`Agente ${codigo} nao pode ser executado: status de homologacao e "${status}", nao "homologado".`);
    this.name = "AgentoNaoHomologadoError";
    this.codigo = codigo;
    this.status = status;
  }
}

async function verificar(agente) {
  if (agente.status_homologacao !== "homologado") {
    throw new AgentoNaoHomologadoError(agente.codigo, agente.status_homologacao);
  }

  // Verificacao adicional: confirma que os 5 testes do BASS Modulo 15
  // realmente foram registrados como aprovados na tabela homologacoes,
  // e nao apenas que o campo de status foi alterado manualmente.
  const { rows } = await query(
    `SELECT teste_tecnico, teste_funcional, teste_seguranca, teste_governanca, teste_performance
     FROM homologacoes WHERE agente_id = $1 ORDER BY aprovado_em DESC NULLS LAST LIMIT 1`,
    [agente.id]
  );

  const registro = rows[0];
  const todosAprovados =
    registro &&
    registro.teste_tecnico &&
    registro.teste_funcional &&
    registro.teste_seguranca &&
    registro.teste_governanca &&
    registro.teste_performance;

  if (!todosAprovados) {
    throw new AgentoNaoHomologadoError(agente.codigo, "status divergente do registro de testes");
  }

  return true;
}

module.exports = { verificar, AgentoNaoHomologadoError };
