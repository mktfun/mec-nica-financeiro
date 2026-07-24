const { query } = require("./db");

/**
 * Connector Manager (EA-DOC-002, Secao 7)
 * Versionamento independente por conector -- quando a Porto Seguro
 * muda o portal, so o conector correspondente precisa ser atualizado,
 * nao o agente inteiro.
 */

async function buscarPorNome(nome) {
  const { rows } = await query(`SELECT * FROM connectors WHERE nome = $1`, [nome]);
  return rows[0] || null;
}

async function listar() {
  const { rows } = await query(`SELECT * FROM connectors ORDER BY nome`);
  return rows;
}

/**
 * Publica uma nova versao de um conector. O autoteste (status_autoteste)
 * comeca "pendente" -- so um chamador explicito (ex.: pipeline de CI,
 * ou o operador via API) marca como aprovado ou reverte.
 */
async function publicarNovaVersao(nome, novaVersao) {
  const conector = await buscarPorNome(nome);
  if (!conector) throw new Error(`Conector "${nome}" nao encontrado.`);

  await query(
    `INSERT INTO connector_updates (connector_id, versao_anterior, versao_nova, status_autoteste)
     VALUES ($1, $2, $3, 'pendente')`,
    [conector.id, conector.versao, novaVersao]
  );
  await query(
    `UPDATE connectors SET versao = $1, atualizado_em = now() WHERE id = $2`,
    [novaVersao, conector.id]
  );
  return buscarPorNome(nome);
}

/**
 * Reverte um conector para a versao anterior registrada no update mais
 * recente -- usado quando o autoteste pos-atualizacao falha (EA-DOC-002 §7.2).
 */
async function reverterUltimaAtualizacao(nome) {
  const conector = await buscarPorNome(nome);
  if (!conector) throw new Error(`Conector "${nome}" nao encontrado.`);

  const { rows } = await query(
    `SELECT * FROM connector_updates WHERE connector_id = $1 AND revertido_em IS NULL
     ORDER BY aplicado_em DESC LIMIT 1`,
    [conector.id]
  );
  const ultimaAtualizacao = rows[0];
  if (!ultimaAtualizacao) throw new Error(`Nenhuma atualizacao reversivel encontrada para "${nome}".`);

  await query(
    `UPDATE connectors SET versao = $1, status = 'ativo', atualizado_em = now() WHERE id = $2`,
    [ultimaAtualizacao.versao_anterior, conector.id]
  );
  await query(
    `UPDATE connector_updates SET status_autoteste = 'falhou_rollback', revertido_em = now() WHERE id = $1`,
    [ultimaAtualizacao.id]
  );
  return buscarPorNome(nome);
}

async function marcarFalha(nome) {
  await query(`UPDATE connectors SET status = 'com_falha' WHERE nome = $1`, [nome]);
}

async function marcarAtivo(nome) {
  await query(`UPDATE connectors SET status = 'ativo' WHERE nome = $1`, [nome]);
}

module.exports = { buscarPorNome, listar, publicarNovaVersao, reverterUltimaAtualizacao, marcarFalha, marcarAtivo };
