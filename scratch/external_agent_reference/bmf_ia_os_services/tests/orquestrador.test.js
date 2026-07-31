const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { BASE, jsonOuTexto } = require("./helpers");

describe("Orquestrador — Saúde", () => {
  test("GET /health responde ok", async () => {
    const res = await fetch(`${BASE.orquestrador}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
  });
});

describe("Orquestrador — Pipeline Completo", () => {
  test("requisição comum é classificada, roteada e respondida pelo Agent Runtime", async () => {
    const res = await fetch(`${BASE.orquestrador}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: "Qual a projeção de crescimento para o próximo trimestre?" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.intent, "deveria ter classificado uma intenção");
    assert.ok(body.agente, "deveria ter roteado para um agente");
    assert.ok(body.resultado, "deveria ter recebido um resultado do Agent Runtime");
  });

  test("ação sensível é escalada para humano, sem chamar o Agent Runtime", async () => {
    const res = await fetch(`${BASE.orquestrador}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: "Cancele meu contrato", acao: "cancelar_contrato" }),
    });
    assert.equal(res.status, 202);
    const body = await jsonOuTexto(res);
    assert.equal(body.status, "aguardando_aprovacao_humana");
    assert.ok(body.motivoEscalonamento);
  });

  test("ação permitida por política não é escalada", async () => {
    const res = await fetch(`${BASE.orquestrador}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: "Responda a dúvida do cliente", acao: "responder_pergunta" }),
    });
    assert.notEqual(res.status, 202);
  });
});
