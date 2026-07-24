/**
 * Conector de TESTE (nao usar em produção) — nunca resolve, usado
 * para validar que o Sandbox (EA-DOC-002 §8) mata o processo travado
 * sem afetar o Integration Hub.
 */
async function enviar(acao, payload) {
  await new Promise(() => {}); // nunca resolve
}
module.exports = { enviar };
