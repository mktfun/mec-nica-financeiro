require("dotenv").config();
const express = require("express");
const { pool } = require("./db");
const redis = require("./redis");
const engine = require("./engine");
const eventBus = require("./eventBus");
const skillDrafting = require("./skillDrafting");
const skillReview = require("./skillReview");

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8083;

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    await redis.ping();
    res.json({ status: "ok", service: "workflow-engine" });
  } catch (err) {
    res.status(503).json({ status: "erro", detalhe: err.message });
  }
});

app.post("/workflows/:nome/start", async (req, res) => {
  try {
    const instancia = await engine.iniciarWorkflow(req.params.nome, req.body.clienteId, req.body.contexto || {});
    res.status(202).json(instancia);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

app.get("/workflows/instances/:id", async (req, res) => {
  const store = require("./workflowStore");
  const instancia = await store.buscarInstancia(req.params.id);
  if (!instancia) return res.status(404).json({ erro: "instancia_nao_encontrada" });
  const stepsRes = await pool.query(
    `SELECT nome_step, status, resultado, ordem FROM workflow_steps WHERE workflow_instance_id = $1 ORDER BY ordem`,
    [req.params.id]
  );
  res.json({ ...instancia, steps: stepsRes.rows });
});

// Publica um evento manualmente (util para testes e para o Scheduler)
app.post("/events/:tipo", async (req, res) => {
  const resultado = await eventBus.publicar(req.params.tipo, req.body || {});
  res.status(202).json(resultado);
});

// ---------- Learning Agent: rascunho, revisao e capacitacao (PROC-LEARN-DOC-001) ----------

app.post("/skills/draft", async (req, res) => {
  const { nomeProcesso, textoDocumento, documentoOrigemId } = req.body;
  if (!nomeProcesso || (!textoDocumento && !documentoOrigemId)) {
    return res.status(400).json({
      erro: "campos_obrigatorios",
      detalhe: "nomeProcesso é obrigatório, e ao menos um de textoDocumento ou documentoOrigemId deve ser informado",
    });
  }
  try {
    const rascunho = await skillDrafting.redigirRascunho({ nomeProcesso, textoDocumento, documentoOrigemId });
    res.status(201).json(rascunho);
  } catch (err) {
    res.status(500).json({ erro: "falha_ao_redigir_rascunho", detalhe: err.message });
  }
});

app.get("/skills/drafts", async (req, res) => {
  res.json(await skillReview.listarRascunhos());
});

app.post("/skills/:id/approve", async (req, res) => {
  try {
    const aprovado = await skillReview.aprovar(req.params.id, req.body.colaboradorId);
    res.json(aprovado);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

app.post("/skills/:id/reject", async (req, res) => {
  try {
    const rejeitado = await skillReview.rejeitar(req.params.id, req.body.motivo);
    res.json(rejeitado);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

app.post("/skills/:id/grant/:codigoAgente", async (req, res) => {
  try {
    const capacitacao = await skillReview.capacitarAgente(req.params.id, req.params.codigoAgente, req.body.colaboradorId);
    res.status(201).json(capacitacao);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

app.post("/skills/:id/revoke/:codigoAgente", async (req, res) => {
  try {
    const revogado = await skillReview.revogarCapacitacao(req.params.id, req.params.codigoAgente);
    if (!revogado) return res.status(404).json({ erro: "capacitacao_nao_encontrada" });
    res.json(revogado);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

app.get("/agents/:codigoAgente/skills", async (req, res) => {
  res.json(await skillReview.listarCapacitacoes(req.params.codigoAgente));
});

app.listen(PORT, () => {
  console.log(`[workflow-engine] escutando na porta ${PORT}`);
});

// ---------- Loop consumidor do Event Bus ----------
// Roda em paralelo ao servidor HTTP: toda vez que um evento chega
// e existe uma workflow_waits pendente para ele, retoma a instancia.
async function loopConsumidor() {
  while (true) {
    try {
      await eventBus.consumir("workflow-engine-1", async (evento) => {
        console.log(`[workflow-engine] evento recebido: ${evento.tipo_evento}`);
        await engine.retomarPorEvento(evento.tipo_evento, evento.dados);
      }, { blockMs: 5000 });
    } catch (err) {
      console.error("[workflow-engine] erro no loop consumidor:", err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
loopConsumidor();

module.exports = app;
