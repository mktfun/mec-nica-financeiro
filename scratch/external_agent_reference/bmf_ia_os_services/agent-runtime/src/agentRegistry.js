const { query } = require("./db");

/**
 * Agent Registry (C4-DOC-001, Secao 4.2)
 * Carrega a ficha BASS de um agente a partir da tabela agentes_ia
 * (DM-DOC-001, Secao 3.2). Fonte unica de verdade sobre quem o
 * agente e, o que pode fazer e qual seu status de homologacao.
 */

async function findByCodigo(codigo) {
  const { rows } = await query(
    `SELECT id, codigo, nome, cargo, role_curto, departamento,
            supervisor_agente_id, classe, versao, status_homologacao, ficha_bass
     FROM agentes_ia WHERE codigo = $1`,
    [codigo]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT id, codigo, nome, cargo, role_curto, departamento,
            supervisor_agente_id, classe, versao, status_homologacao, ficha_bass
     FROM agentes_ia WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listByDepartamento(departamento) {
  const { rows } = await query(
    `SELECT id, codigo, nome, role_curto, classe, status_homologacao
     FROM agentes_ia WHERE departamento = $1 ORDER BY classe`,
    [departamento]
  );
  return rows;
}

async function listAll() {
  const { rows } = await query(
    `SELECT id, codigo, nome, role_curto, departamento, classe, status_homologacao
     FROM agentes_ia ORDER BY departamento, classe`
  );
  return rows;
}

module.exports = { findByCodigo, findById, listByDepartamento, listAll };
