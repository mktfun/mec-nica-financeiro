const { query } = require("./db");

/**
 * Workflow Store (EA-DOC-002, Secao 4.1)
 * Acesso as tabelas workflow_definitions / workflow_instances /
 * workflow_steps / workflow_waits (migracao V7).
 */

async function buscarDefinicao(nome, versao = null) {
  const sql = versao
    ? `SELECT * FROM workflow_definitions WHERE nome = $1 AND versao = $2 AND ativo = true`
    : `SELECT * FROM workflow_definitions WHERE nome = $1 AND ativo = true ORDER BY versao DESC LIMIT 1`;
  const params = versao ? [nome, versao] : [nome];
  const { rows } = await query(sql, params);
  return rows[0] || null;
}

async function criarInstancia(workflowDefinitionId, clienteId, contextoInicial) {
  const { rows } = await query(
    `INSERT INTO workflow_instances (workflow_definition_id, cliente_id, contexto)
     VALUES ($1, $2, $3) RETURNING *`,
    [workflowDefinitionId, clienteId || null, JSON.stringify(contextoInicial || {})]
  );
  return rows[0];
}

async function buscarInstancia(id) {
  const { rows } = await query(`SELECT * FROM workflow_instances WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function listarInstanciasAtivas() {
  const { rows } = await query(
    `SELECT * FROM workflow_instances WHERE status IN ('em_execucao', 'aguardando')`
  );
  return rows;
}

async function atualizarInstancia(id, { status, contexto, stepAtual, concluidoEm }) {
  const campos = [];
  const valores = [];
  let i = 1;
  if (status !== undefined) { campos.push(`status = $${i++}`); valores.push(status); }
  if (contexto !== undefined) { campos.push(`contexto = $${i++}`); valores.push(JSON.stringify(contexto)); }
  if (stepAtual !== undefined) { campos.push(`step_atual = $${i++}`); valores.push(stepAtual); }
  if (concluidoEm !== undefined) { campos.push(`concluido_em = $${i++}`); valores.push(concluidoEm); }
  valores.push(id);
  await query(`UPDATE workflow_instances SET ${campos.join(", ")} WHERE id = $${i}`, valores);
}

async function registrarStep(instanciaId, ordem, nomeStep, eventoGatilho, eventoConclusao) {
  const { rows } = await query(
    `INSERT INTO workflow_steps (workflow_instance_id, ordem, nome_step, evento_gatilho, evento_conclusao, status, iniciado_em)
     VALUES ($1, $2, $3, $4, $5, 'em_execucao', now()) RETURNING *`,
    [instanciaId, ordem, nomeStep, eventoGatilho, eventoConclusao]
  );
  return rows[0];
}

async function concluirStep(stepId, status, resultado) {
  await query(
    `UPDATE workflow_steps SET status = $1, resultado = $2, concluido_em = now() WHERE id = $3`,
    [status, JSON.stringify(resultado), stepId]
  );
}

async function criarEspera(instanciaId, aguardandoEvento, expiraEm, acaoExpiracao) {
  const { rows } = await query(
    `INSERT INTO workflow_waits (workflow_instance_id, aguardando_evento, expira_em, acao_expiracao)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [instanciaId, aguardandoEvento, expiraEm || null, acaoExpiracao || "cancelar"]
  );
  return rows[0];
}

async function buscarEsperaAtiva(instanciaId, evento) {
  const { rows } = await query(
    `SELECT * FROM workflow_waits WHERE workflow_instance_id = $1 AND aguardando_evento = $2 AND resolvido_em IS NULL`,
    [instanciaId, evento]
  );
  return rows[0] || null;
}

async function resolverEspera(id) {
  await query(`UPDATE workflow_waits SET resolvido_em = now() WHERE id = $1`, [id]);
}

async function buscarEsperasPorEvento(evento) {
  const { rows } = await query(
    `SELECT * FROM workflow_waits WHERE aguardando_evento = $1 AND resolvido_em IS NULL`,
    [evento]
  );
  return rows;
}

module.exports = {
  buscarDefinicao, criarInstancia, buscarInstancia, listarInstanciasAtivas, atualizarInstancia,
  registrarStep, concluirStep, criarEspera, buscarEsperaAtiva, buscarEsperasPorEvento, resolverEspera,
};
