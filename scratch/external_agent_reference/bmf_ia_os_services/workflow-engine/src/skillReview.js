const { query } = require("./db");

/**
 * Skill Review & Capacitation (PROC-LEARN-DOC-001, Secoes 3 e 6)
 * Fila de revisao humana + registro de capacitacao de agentes.
 * Nenhuma funcao aqui e chamada automaticamente pelo Learning Agent —
 * todas exigem uma acao humana (ou do CGO IA) explicita.
 */

async function listarRascunhos() {
  const { rows } = await query(
    `SELECT id, nome, versao, descricao, status_publicacao, criado_por_agente_id, criado_em
     FROM workflow_definitions WHERE status_publicacao = 'rascunho' ORDER BY criado_em DESC`
  );
  return rows;
}

async function aprovar(id, colaboradorId) {
  const { rows } = await query(
    `UPDATE workflow_definitions
     SET status_publicacao = 'ativo', ativo = true
     WHERE id = $1 AND status_publicacao IN ('rascunho', 'em_revisao')
     RETURNING *`,
    [id]
  );
  if (!rows[0]) throw new Error("Rascunho não encontrado ou já não está pendente de revisão.");
  return rows[0];
}

async function rejeitar(id, motivo) {
  const { rows } = await query(
    `UPDATE workflow_definitions
     SET status_publicacao = 'rejeitado', motivo_rejeicao = $2
     WHERE id = $1 AND status_publicacao IN ('rascunho', 'em_revisao')
     RETURNING *`,
    [id, motivo || "Motivo não informado."]
  );
  if (!rows[0]) throw new Error("Rascunho não encontrado ou já não está pendente de revisão.");
  return rows[0];
}

/**
 * "Capacitar um agente" (PROC-LEARN-DOC-001, Secao 4): nao e
 * retreinamento — e apenas conceder permissao (agente_skills), a
 * mesma logica de RBAC ja usada pelo Tool Broker.
 */
async function capacitarAgente(workflowDefinitionId, codigoAgente, colaboradorId) {
  const defRes = await query(`SELECT status_publicacao FROM workflow_definitions WHERE id = $1`, [workflowDefinitionId]);
  if (!defRes.rows[0]) throw new Error("Skill não encontrada.");
  if (defRes.rows[0].status_publicacao !== "ativo") {
    throw new Error(`Só é possível capacitar agentes em Skills com status "ativo" (atual: "${defRes.rows[0].status_publicacao}").`);
  }

  const agenteRes = await query(`SELECT id FROM agentes_ia WHERE codigo = $1`, [codigoAgente]);
  if (!agenteRes.rows[0]) throw new Error(`Agente ${codigoAgente} não encontrado.`);

  const { rows } = await query(
    `INSERT INTO agente_skills (agente_id, workflow_definition_id, concedido_por_colaborador_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (agente_id, workflow_definition_id) DO UPDATE SET revogado_em = NULL
     RETURNING *`,
    [agenteRes.rows[0].id, workflowDefinitionId, colaboradorId || null]
  );
  return rows[0];
}

async function revogarCapacitacao(workflowDefinitionId, codigoAgente) {
  const agenteRes = await query(`SELECT id FROM agentes_ia WHERE codigo = $1`, [codigoAgente]);
  if (!agenteRes.rows[0]) throw new Error(`Agente ${codigoAgente} não encontrado.`);

  const { rows } = await query(
    `UPDATE agente_skills SET revogado_em = now()
     WHERE agente_id = $1 AND workflow_definition_id = $2 AND revogado_em IS NULL
     RETURNING *`,
    [agenteRes.rows[0].id, workflowDefinitionId]
  );
  return rows[0] || null;
}

async function listarCapacitacoes(codigoAgente) {
  const { rows } = await query(
    `SELECT wd.nome, wd.versao, ags.concedido_em, ags.revogado_em
     FROM agente_skills ags
     JOIN agentes_ia a ON a.id = ags.agente_id
     JOIN workflow_definitions wd ON wd.id = ags.workflow_definition_id
     WHERE a.codigo = $1
     ORDER BY ags.concedido_em DESC`,
    [codigoAgente]
  );
  return rows;
}

module.exports = { listarRascunhos, aprovar, rejeitar, capacitarAgente, revogarCapacitacao, listarCapacitacoes };
