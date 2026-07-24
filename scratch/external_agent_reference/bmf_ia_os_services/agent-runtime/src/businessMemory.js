const { query } = require("./db");
const toolBroker = require("./toolBroker");

/**
 * Business Memory (EA-DOC-003, Secao 6)
 * Diferente de memoria_agentes (isolada por agente_id), esta memoria
 * e escopada por cliente_id -- qualquer agente autorizado pode ler o
 * que ja se sabe sobre aquele cliente, independente de quem registrou.
 *
 * Acesso continua passando pelo Tool Broker (RBAC), preservando o
 * mesmo modelo de permissao ja usado para ferramentas e conectores.
 */

// Limite padrao de registros retornados por leitura -- sem isso, um
// cliente atendido por anos poderia devolver centenas de registros
// para dentro de um prompt, reabrindo o mesmo risco de contexto sem
// limite que o Context Compressor resolveu para a memoria de Sessao.
const LIMITE_PADRAO = Number(process.env.BUSINESS_MEMORY_LIMITE) || 20;

async function registrar(agenteId, clienteId, categoria, conteudo, confianca = "inferida_baixa") {
  const { rows } = await query(
    `INSERT INTO memoria_negocio (cliente_id, categoria, conteudo, agente_origem_id, confianca)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [clienteId, categoria, JSON.stringify(conteudo), agenteId, confianca]
  );
  return rows[0];
}

/**
 * Le a memoria de negocio de um cliente, verificando primeiro se o
 * agente solicitante tem permissao para a ferramenta "memoria_negocio"
 * (mesmo mecanismo do BASS Modulo 7 / Tool Broker).
 *
 * Sempre limitada (padrao 20, configuravel via BUSINESS_MEMORY_LIMITE
 * ou pelo parametro `limite`) e sempre ordenada do mais recente para o
 * mais antigo -- os registros mais novos tendem a ser os mais
 * relevantes para a conversa corrente.
 */
async function ler(agenteId, clienteId, categoria = null, limite = LIMITE_PADRAO) {
  await toolBroker.solicitar(agenteId, "memoria_negocio");

  const sql = categoria
    ? `SELECT * FROM memoria_negocio WHERE cliente_id = $1 AND categoria = $2 ORDER BY criado_em DESC LIMIT $3`
    : `SELECT * FROM memoria_negocio WHERE cliente_id = $1 ORDER BY criado_em DESC LIMIT $2`;
  const params = categoria ? [clienteId, categoria, limite] : [clienteId, limite];
  const { rows } = await query(sql, params);
  return rows;
}

/**
 * Conta o total de registros existentes (sem limite) — para que quem
 * consome a API saiba se está vendo tudo ou apenas um recorte.
 */
async function contarTotal(agenteId, clienteId, categoria = null) {
  await toolBroker.solicitar(agenteId, "memoria_negocio");
  const sql = categoria
    ? `SELECT count(*)::int AS total FROM memoria_negocio WHERE cliente_id = $1 AND categoria = $2`
    : `SELECT count(*)::int AS total FROM memoria_negocio WHERE cliente_id = $1`;
  const params = categoria ? [clienteId, categoria] : [clienteId];
  const { rows } = await query(sql, params);
  return rows[0].total;
}

module.exports = { registrar, ler, contarTotal, LIMITE_PADRAO };
