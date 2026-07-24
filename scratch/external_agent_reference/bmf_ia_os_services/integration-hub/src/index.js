require("dotenv").config();
const express = require("express");
const { pool } = require("./db");
const redis = require("./redis");
const connectorRegistry = require("./connectorRegistry");
const connectorManager = require("./connectorManager");
const rateLimiter = require("./rateLimiter");
const webhookReceiver = require("./webhookReceiver");
const sandbox = require("./sandbox");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8082;

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    await redis.ping();
    res.json({ status: "ok", service: "integration-hub", conectores: connectorRegistry.listar() });
  } catch (err) {
    res.status(503).json({ status: "erro", detalhe: err.message });
  }
});

app.post("/integrations/:conector/dispatch", async (req, res) => {
  const { conector: nomeConector } = req.params;
  const { acao, payload } = req.body;

  try {
    // Connector Manager (EA-DOC-002 §7): recusa despacho para conector
    // marcado com falha ou descontinuado.
    const registroConector = await connectorManager.buscarPorNome(nomeConector);
    if (registroConector && (registroConector.status === "com_falha" || registroConector.status === "descontinuado")) {
      return res.status(503).json({ erro: `conector_indisponivel`, status: registroConector.status });
    }

    await rateLimiter.verificarLimite(nomeConector);
    connectorRegistry.obter(nomeConector); // valida que o conector existe no registry local

    const connectorPath = path.join(__dirname, "connectors", `${nomeConector}Connector.js`);

    // Sandbox (EA-DOC-002 §8): a chamada roda em processo separado,
    // com timeout -- uma trava ou excecao no conector nao derruba o
    // Integration Hub.
    const resultado = await rateLimiter.comRetry(() =>
      sandbox.executarIsolado(nomeConector, connectorPath, acao, payload)
    );

    if (registroConector) await connectorManager.marcarAtivo(nomeConector);
    res.json({ conector: nomeConector, ...resultado });
  } catch (err) {
    if (err.name === "SandboxTimeoutError" || err.name === "SandboxCrashError") {
      if (await connectorManager.buscarPorNome(nomeConector)) {
        await connectorManager.marcarFalha(nomeConector);
      }
      return res.status(502).json({ erro: err.name, detalhe: err.message });
    }
    res.status(err.message.includes("Limite de taxa") ? 429 : 502).json({ erro: err.message });
  }
});

app.get("/connectors", async (req, res) => {
  res.json(await connectorManager.listar());
});

app.post("/connectors/:nome/versions", async (req, res) => {
  try {
    const atualizado = await connectorManager.publicarNovaVersao(req.params.nome, req.body.versao);
    res.status(201).json(atualizado);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

app.post("/connectors/:nome/rollback", async (req, res) => {
  try {
    const revertido = await connectorManager.reverterUltimaAtualizacao(req.params.nome);
    res.json(revertido);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

app.post("/webhooks/:origem", async (req, res) => {
  const evento = await webhookReceiver.receber(req.params.origem, req.body);
  res.status(202).json({ recebido: true, evento });
});

app.listen(PORT, () => {
  console.log(`[integration-hub] escutando na porta ${PORT}`);
});

module.exports = app;
