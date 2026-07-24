const { query } = require("../db");

/**
 * Seguradoras Connector (C4-DOC-002, Secao 2)
 *
 * ATENÇÃO: conector simulado. Usa a tabela `seguradoras` (DM-DOC-001)
 * para validar que a seguradora existe no cadastro, mas não faz
 * nenhuma chamada de rede real — cada seguradora parceira tem sua
 * própria API, a integrar uma a uma conforme os acordos comerciais
 * forem fechados.
 */

async function enviar(acao, payload) {
  const { seguradoraId } = payload;
  if (seguradoraId) {
    const { rows } = await query(`SELECT nome, api_endpoint FROM seguradoras WHERE id = $1`, [seguradoraId]);
    if (rows.length === 0) {
      throw new Error(`Seguradora ${seguradoraId} não cadastrada.`);
    }
    if (!rows[0].api_endpoint) {
      return {
        simulado: true,
        aviso: `Seguradora "${rows[0].nome}" cadastrada, mas sem api_endpoint configurado — resposta simulada.`,
        acao,
        resultado: "aceito_simulado",
      };
    }
  }

  return { simulado: true, aviso: "Integração real com seguradoras ainda não implementada.", acao, payload };
}

module.exports = { enviar };
