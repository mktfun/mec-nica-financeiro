const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { BASE, aguardarCondicao } = require("./helpers");

describe("Scheduler — Saúde", () => {
  test("GET /health responde ok", async () => {
    const res = await fetch(`${BASE.scheduler}/health`);
    assert.equal(res.status, 200);
  });
});

describe("Scheduler — Timer Único (EA-DOC-003 §5)", () => {
  test("timer com data no passado dispara no próximo tick e se autodesativa", async () => {
    const nomeUnico = `Teste Suite ${Date.now()}`;
    const criar = await fetch(`${BASE.scheduler}/agendamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nomeUnico,
        tipo: "timer_unico",
        proximaExecucao: "2020-01-01T00:00:00Z",
        eventoAPublicar: "TesteSuiteEvento",
        payload: { origem: "suite-automatizada" },
      }),
    });
    assert.equal(criar.status, 201);
    const agendamento = await criar.json();

    // Forca o tick imediatamente em vez de esperar ate 60s pelo timer natural.
    const tick = await fetch(`${BASE.scheduler}/admin/tick`, { method: "POST" });
    assert.equal(tick.status, 200);

    const final = await aguardarCondicao(
      async () => {
        const r = await fetch(`${BASE.scheduler}/agendamentos`);
        const lista = await r.json();
        const item = lista.find((a) => a.id === agendamento.id);
        return item && !item.ativo ? item : null;
      },
      { tentativas: 10, intervaloMs: 500, mensagem: "timer_unico se autodesativar após disparar" }
    );

    assert.equal(final.ativo, false);
    assert.ok(final.ultima_execucao, "deveria ter registrado a última execução");
  });
});
