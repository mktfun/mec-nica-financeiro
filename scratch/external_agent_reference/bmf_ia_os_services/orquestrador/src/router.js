const { query } = require("./db");

/**
 * Router (C4-DOC-001, Secao 4.1)
 * Seleciona o agente executivo (Classe A ou B) owner do
 * departamento identificado pelo Intent Classifier — a Matriz
 * Capacidade -> Agente Executivo do EA-DOC-001 (Secao 6.2),
 * mas lida diretamente da tabela agentes_ia, nao de um documento.
 */

async function rotear(departamento) {
  const { rows } = await query(
    `SELECT codigo, nome, role_curto, classe, status_homologacao
     FROM agentes_ia
     WHERE departamento = $1 AND classe IN ('A', 'B')
     ORDER BY classe LIMIT 1`,
    [departamento]
  );

  if (rows.length === 0) {
    throw new Error(`Nenhum agente executivo encontrado para o departamento "${departamento}".`);
  }

  return rows[0];
}

module.exports = { rotear };
