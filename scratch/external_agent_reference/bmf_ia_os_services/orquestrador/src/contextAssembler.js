const { query } = require("./db");

/**
 * Context Assembler (C4-DOC-001, Secao 4.1)
 * Monta o contexto necessario: historico do cliente, apolices
 * ativas, e ultimas atividades — para o agente nao precisar
 * perguntar de novo o que ja esta no banco de dados.
 */

async function montar({ clienteId }) {
  if (!clienteId) return { cliente: null };

  const clienteRes = await query(`SELECT id, nome_razao_social, status FROM clientes WHERE id = $1`, [clienteId]);
  const cliente = clienteRes.rows[0] || null;
  if (!cliente) return { cliente: null };

  const apolicesRes = await query(
    `SELECT numero_apolice, status, data_fim FROM apolices WHERE cliente_id = $1 ORDER BY data_fim DESC LIMIT 5`,
    [clienteId]
  );

  const atividadesRes = await query(
    `SELECT tipo, descricao, criado_em FROM atividades WHERE cliente_id = $1 ORDER BY criado_em DESC LIMIT 5`,
    [clienteId]
  );

  return {
    cliente,
    apolices: apolicesRes.rows,
    atividadesRecentes: atividadesRes.rows,
  };
}

module.exports = { montar };
