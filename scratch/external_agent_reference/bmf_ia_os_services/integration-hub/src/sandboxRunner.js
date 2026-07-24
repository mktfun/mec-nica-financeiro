/**
 * Ponto de entrada do processo filho do Sandbox (EA-DOC-002, Secao 8).
 * Roda uma unica chamada de conector isolada do processo principal do
 * Integration Hub -- se travar ou lancar excecao, so este processo
 * filho e afetado.
 */
process.on("message", async ({ connectorPath, acao, payload }) => {
  try {
    const conector = require(connectorPath);
    const resultado = await conector.enviar(acao, payload);
    process.send({ ok: true, resultado });
  } catch (err) {
    process.send({ ok: false, erro: err.message });
  } finally {
    process.exit(0);
  }
});
