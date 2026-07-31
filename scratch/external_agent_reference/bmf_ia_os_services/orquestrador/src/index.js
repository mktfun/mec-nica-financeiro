require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const { pool } = require("./db");
const redis = require("./redis");
const intentClassifier = require("./intentClassifier");
const contextAssembler = require("./contextAssembler");
const router = require("./router");
const priorityQueue = require("./priorityQueue");
const escalationHandler = require("./escalationHandler");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const AGENT_RUNTIME_URL = process.env.AGENT_RUNTIME_URL || "http://localhost:8081";

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    await redis.ping();
    res.json({ status: "ok", service: "orquestrador" });
  } catch (err) {
    res.status(503).json({ status: "erro", detalhe: err.message });
  }
});

/**
 * Pipeline completo (C4-DOC-001, Figura 2):
 * Intent Classifier -> Context Assembler -> Router -> Priority Queue
 * -> Escalation Handler -> (Agent Runtime) -> Response Consolidator
 */
app.post("/requests", async (req, res) => {
  const { texto, clienteId, acao, prioridade } = req.body;
  if (!texto) return res.status(400).json({ erro: "campo_texto_obrigatorio" });

  const tarefaId = `tarefa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    // 1) Intent Classifier
    const intent = intentClassifier.classificar(texto);

    // 2) Context Assembler
    const contexto = await contextAssembler.montar({ clienteId });

    // 3) Router
    const agente = await router.rotear(intent.departamento);

    // 4) Priority Queue
    await priorityQueue.enfileirar(intent.departamento, tarefaId, prioridade);

    // 5) Escalation Handler
    const escalonamento = acao ? escalationHandler.avaliar(acao) : { requerHumano: false, motivo: "Nenhuma ação sensível informada." };

    if (escalonamento.requerHumano) {
      return res.status(202).json({
        tarefaId,
        status: "aguardando_aprovacao_humana",
        intent,
        agenteSugerido: agente,
        motivoEscalonamento: escalonamento.motivo,
      });
    }

    // 6) Delega ao Agent Runtime (chamada HTTP real entre os dois serviços)
    const respostaAgente = await fetch(`${AGENT_RUNTIME_URL}/agents/${agente.codigo}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objetivo: texto, conversaId: clienteId || tarefaId, tarefaId }),
    }).then((r) => r.json());

    // 7) Response Consolidator
    const respostaFinal = {
      tarefaId,
      intent,
      agente: respostaAgente.agente || agente,
      contexto,
      resultado: respostaAgente.resultado || respostaAgente.erro,
      status: respostaAgente.status || "erro",
    };

    res.json(respostaFinal);
  } catch (err) {
    res.status(500).json({ tarefaId, erro: "falha_no_pipeline", detalhe: err.message });
  }
});

app.get("/queue/:departamento/size", async (req, res) => {
  const tamanho = await priorityQueue.tamanhoFila(req.params.departamento);
  res.json({ departamento: req.params.departamento, tamanho });
});

app.listen(PORT, () => {
  console.log(`[orquestrador] escutando na porta ${PORT}`);
  console.log(`[orquestrador] agent-runtime em ${AGENT_RUNTIME_URL}`);
});

module.exports = app;
