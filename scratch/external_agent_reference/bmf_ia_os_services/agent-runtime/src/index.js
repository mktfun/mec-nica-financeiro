require("dotenv").config();
const express = require("express");
const { pool } = require("./db");
const redis = require("./redis");
const registry = require("./agentRegistry");
const executor = require("./agentExecutor");
const gate = require("./homologationGate");
const toolBroker = require("./toolBroker");
const businessMemory = require("./businessMemory");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8081;

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    await redis.ping();
    res.json({ status: "ok", service: "agent-runtime", db: "conectado", redis: "conectado" });
  } catch (err) {
    res.status(503).json({ status: "erro", detalhe: err.message });
  }
});

app.get("/agents", async (req, res) => {
  const agentes = req.query.departamento
    ? await registry.listByDepartamento(req.query.departamento)
    : await registry.listAll();
  res.json(agentes);
});

app.get("/agents/:codigo", async (req, res) => {
  const agente = await registry.findByCodigo(req.params.codigo);
  if (!agente) return res.status(404).json({ erro: "agente_nao_encontrado" });
  res.json(agente);
});

app.get("/agents/:codigo/homologacao", async (req, res) => {
  const agente = await registry.findByCodigo(req.params.codigo);
  if (!agente) return res.status(404).json({ erro: "agente_nao_encontrado" });
  try {
    await gate.verificar(agente);
    res.json({ codigo: agente.codigo, homologado: true });
  } catch (err) {
    res.json({ codigo: agente.codigo, homologado: false, motivo: err.message });
  }
});

app.post("/agents/:codigo/execute", async (req, res) => {
  const { objetivo, conversaId, tarefaId } = req.body;
  if (!objetivo) return res.status(400).json({ erro: "campo_objetivo_obrigatorio" });

  try {
    const resultado = await executor.executar(req.params.codigo, { objetivo, conversaId, tarefaId });
    res.json(resultado);
  } catch (err) {
    if (err.name === "AgentoNaoHomologadoError") {
      return res.status(403).json({ erro: "agente_nao_homologado", detalhe: err.message });
    }
    res.status(500).json({ erro: "falha_execucao", detalhe: err.message });
  }
});

app.post("/agents/:codigo/tools/:ferramenta", async (req, res) => {
  try {
    const resultado = await executor.usarFerramenta(req.params.codigo, req.params.ferramenta);
    res.json(resultado);
  } catch (err) {
    if (err.name === "FerramentaNaoAutorizadaError") {
      return res.status(403).json({ erro: "ferramenta_nao_autorizada", detalhe: err.message });
    }
    res.status(500).json({ erro: "falha", detalhe: err.message });
  }
});

app.post("/business-memory/:codigoAgente/:clienteId", async (req, res) => {
  const { codigoAgente, clienteId } = req.params;
  const { categoria, conteudo, confianca } = req.body;
  try {
    const agente = await registry.findByCodigo(codigoAgente);
    if (!agente) return res.status(404).json({ erro: "agente_nao_encontrado" });
    const registro = await businessMemory.registrar(agente.id, clienteId, categoria, conteudo, confianca);
    res.status(201).json(registro);
  } catch (err) {
    res.status(500).json({ erro: "falha_registro", detalhe: err.message });
  }
});

app.get("/business-memory/:codigoAgente/:clienteId", async (req, res) => {
  const { codigoAgente, clienteId } = req.params;
  try {
    const agente = await registry.findByCodigo(codigoAgente);
    if (!agente) return res.status(404).json({ erro: "agente_nao_encontrado" });
    const limite = req.query.limite ? Number(req.query.limite) : undefined;
    const registros = await businessMemory.ler(agente.id, clienteId, req.query.categoria, limite);
    const total = await businessMemory.contarTotal(agente.id, clienteId, req.query.categoria);
    res.json({ registros, total, limite: limite || businessMemory.LIMITE_PADRAO, truncado: total > registros.length });
  } catch (err) {
    if (err.name === "FerramentaNaoAutorizadaError") {
      return res.status(403).json({ erro: "sem_permissao_memoria_negocio", detalhe: err.message });
    }
    res.status(500).json({ erro: "falha_leitura", detalhe: err.message });
  }
});

app.get("/agents/:codigo/sessions/:conversaId", async (req, res) => {
  const agente = await registry.findByCodigo(req.params.codigo);
  if (!agente) return res.status(404).json({ erro: "agente_nao_encontrado" });
  const memory = require("./memoryManager");
  const historico = await memory.lerSessao(agente.id, req.params.conversaId);
  res.json({ tamanho: historico.length, historico });
});

app.listen(PORT, () => {
  console.log(`[agent-runtime] escutando na porta ${PORT}`);
  console.log(`[agent-runtime] ANTHROPIC_API_KEY ${process.env.ANTHROPIC_API_KEY ? "configurada" : "AUSENTE — modo simulado"}`);
});

module.exports = app;
