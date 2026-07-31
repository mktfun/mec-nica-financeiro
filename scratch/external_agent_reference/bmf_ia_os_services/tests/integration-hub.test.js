const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { BASE, jsonOuTexto } = require("./helpers");

describe("Integration Hub — Saúde e Conectores", () => {
  test("GET /health lista os conectores registrados", async () => {
    const res = await fetch(`${BASE.integrationHub}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.ok(body.conectores.includes("crm"));
  });

  test("dispatch para conector inexistente retorna 502", async () => {
    const res = await fetch(`${BASE.integrationHub}/integrations/nao_existe/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "teste", payload: {} }),
    });
    assert.equal(res.status, 502);
  });

  test("dispatch para o conector CRM simulado responde com sucesso", async () => {
    const res = await fetch(`${BASE.integrationHub}/integrations/crm/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "criar_lead", payload: { nome: "Teste Suíte" } }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.simulado, true);
  });
});

describe("Integration Hub — Webhook Receiver", () => {
  test("webhook recebido retorna 202 e publica evento", async () => {
    const res = await fetch(`${BASE.integrationHub}/webhooks/teste-suite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "confirmacao_teste" }),
    });
    assert.equal(res.status, 202);
    const body = await res.json();
    assert.equal(body.recebido, true);
  });
});

describe("Integration Hub — Sandbox (EA-DOC-002 §8)", () => {
  test("conector que lança exceção é isolado (502) sem derrubar o serviço", async () => {
    const antes = await fetch(`${BASE.integrationHub}/health`);
    assert.equal(antes.status, 200);

    const res = await fetch(`${BASE.integrationHub}/integrations/crashTest/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "teste", payload: {} }),
    });
    assert.equal(res.status, 502);

    const depois = await fetch(`${BASE.integrationHub}/health`);
    assert.equal(depois.status, 200, "Integration Hub deveria continuar saudável após a falha do conector");
  });

  test("conector que trava é encerrado por timeout, sem derrubar o serviço", async () => {
    const res = await fetch(`${BASE.integrationHub}/integrations/hangTest/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "teste", payload: {} }),
    });
    assert.equal(res.status, 502);
    const body = await jsonOuTexto(res);
    assert.match(body.erro, /tempo limite do sandbox|travou dentro do sandbox/,
      "a mensagem deveria indicar timeout ou crash do sandbox, mesmo envolvida pelo Retry Handler");

    const depois = await fetch(`${BASE.integrationHub}/health`);
    assert.equal(depois.status, 200, "Integration Hub deveria continuar saudável após o travamento");
  });
});

describe("Integration Hub — Connector Manager (EA-DOC-002 §7)", () => {
  test("GET /connectors lista os conectores versionados", async () => {
    const res = await fetch(`${BASE.integrationHub}/connectors`);
    assert.equal(res.status, 200);
    const conectores = await res.json();
    assert.ok(conectores.find((c) => c.nome === "crm"));
  });

  test("publicar nova versão e depois reverter (rollback)", async () => {
    const publicar = await fetch(`${BASE.integrationHub}/connectors/crm/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versao: "1.1-teste" }),
    });
    assert.equal(publicar.status, 201);
    const atualizado = await publicar.json();
    assert.equal(atualizado.versao, "1.1-teste");

    const reverter = await fetch(`${BASE.integrationHub}/connectors/crm/rollback`, { method: "POST" });
    assert.equal(reverter.status, 200);
    const revertido = await reverter.json();
    assert.equal(revertido.versao, "1.0", "deveria ter voltado para a versão anterior");
  });
});
