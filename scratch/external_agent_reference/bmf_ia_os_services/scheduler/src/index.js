require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const { pool, query } = require("./db");
const { cronBateAgora } = require("./cronMatcher");

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8084;
const WORKFLOW_ENGINE_URL = process.env.WORKFLOW_ENGINE_URL || "http://localhost:8083";

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "scheduler" });
  } catch (err) {
    res.status(503).json({ status: "erro", detalhe: err.message });
  }
});

app.get("/agendamentos", async (req, res) => {
  const { rows } = await query(`SELECT * FROM agendamentos ORDER BY proxima_execucao`);
  res.json(rows);
});

app.post("/agendamentos", async (req, res) => {
  const { nome, tipo, expressaoCron, proximaExecucao, eventoAPublicar, payload } = req.body;
  const { rows } = await query(
    `INSERT INTO agendamentos (nome, tipo, expressao_cron, proxima_execucao, evento_a_publicar, payload)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [nome, tipo || "cron", expressaoCron || null, proximaExecucao, eventoAPublicar, JSON.stringify(payload || {})]
  );
  res.status(201).json(rows[0]);
});

async function publicarEvento(tipoEvento, dados) {
  const resp = await fetch(`${WORKFLOW_ENGINE_URL}/events/${tipoEvento}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados || {}),
  });
  return resp.json();
}

/**
 * Tick executado a cada minuto (EA-DOC-003, Secao 5):
 * - agendamentos tipo "cron": dispara quando a expressao bate com o minuto atual
 * - agendamentos tipo "timer_unico": dispara uma vez quando proxima_execucao <= agora, depois desativa
 */
async function tick() {
  const agora = new Date();
  const { rows } = await query(`SELECT * FROM agendamentos WHERE ativo = true`);

  for (const ag of rows) {
    let deveDisparar = false;

    if (ag.tipo === "cron" && ag.expressao_cron) {
      deveDisparar = cronBateAgora(ag.expressao_cron, agora);
    } else if (ag.tipo === "timer_unico") {
      deveDisparar = new Date(ag.proxima_execucao) <= agora;
    }

    if (!deveDisparar) continue;

    try {
      await publicarEvento(ag.evento_a_publicar, { agendamento_id: ag.id, nome: ag.nome, ...ag.payload });
      console.log(`[scheduler] disparou "${ag.nome}" -> evento "${ag.evento_a_publicar}"`);
      await query(`UPDATE agendamentos SET ultima_execucao = now() WHERE id = $1`, [ag.id]);
      if (ag.tipo === "timer_unico") {
        await query(`UPDATE agendamentos SET ativo = false WHERE id = $1`, [ag.id]);
      }
    } catch (err) {
      console.error(`[scheduler] falha ao disparar "${ag.nome}":`, err.message);
    }
  }
}

// Uso administrativo/testes: forca a checagem de agendamentos agora,
// sem esperar o proximo tick de 60s.
app.post("/admin/tick", async (req, res) => {
  await tick();
  res.json({ status: "tick_executado" });
});

app.listen(PORT, () => {
  console.log(`[scheduler] escutando na porta ${PORT}`);
});

setInterval(tick, 60 * 1000);
tick(); // primeira checagem imediata ao subir

module.exports = { tick, app };
