/**
 * Conector de TESTE (nao usar em produção) — sempre lanca excecao,
 * usado para validar que o Sandbox (EA-DOC-002 §8) isola a falha sem
 * derrubar o Integration Hub.
 */
async function enviar(acao, payload) {
  throw new Error("Falha proposital do conector de teste");
}
module.exports = { enviar };
