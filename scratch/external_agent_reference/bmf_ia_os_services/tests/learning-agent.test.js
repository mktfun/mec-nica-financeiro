const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { BASE } = require("./helpers");

describe("Learning Agent — Redação de Rascunho (PROC-LEARN-DOC-001)", () => {
  let draftId;

  test("POST /skills/draft cria um rascunho com status_publicacao = rascunho", async () => {
    const res = await fetch(`${BASE.workflowEngine}/skills/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeProcesso: `Teste Suite ${Date.now()}`,
        textoDocumento: "Acesse o módulo operacional, clique em Clientes, busque por nome ou CPF.",
      }),
    });
    assert.equal(res.status, 201);
    const rascunho = await res.json();
    assert.equal(rascunho.status_publicacao, "rascunho");
    assert.equal(rascunho.ativo, false);
    draftId = rascunho.id;
  });

  test("rascunho aparece em GET /skills/drafts", async () => {
    const res = await fetch(`${BASE.workflowEngine}/skills/drafts`);
    const lista = await res.json();
    assert.ok(lista.some((d) => d.id === draftId));
  });

  test("capacitar um agente ANTES da aprovação é bloqueado", async () => {
    const res = await fetch(`${BASE.workflowEngine}/skills/${draftId}/grant/BMF-EXEC-001`, { method: "POST" });
    assert.equal(res.status, 400);
  });

  test("aprovar o rascunho o torna ativo", async () => {
    const res = await fetch(`${BASE.workflowEngine}/skills/${draftId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    const aprovado = await res.json();
    assert.equal(aprovado.status_publicacao, "ativo");
    assert.equal(aprovado.ativo, true);
  });

  test("rascunho aprovado some da fila de pendentes", async () => {
    const res = await fetch(`${BASE.workflowEngine}/skills/drafts`);
    const lista = await res.json();
    assert.ok(!lista.some((d) => d.id === draftId));
  });

  test("capacitar um agente APÓS aprovação funciona", async () => {
    const res = await fetch(`${BASE.workflowEngine}/skills/${draftId}/grant/BMF-EXEC-001`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 201);
  });

  test("a Skill aparece na lista de capacitações do agente", async () => {
    const res = await fetch(`${BASE.workflowEngine}/agents/BMF-EXEC-001/skills`);
    const lista = await res.json();
    assert.ok(lista.some((s) => s.revogado_em === null));
  });

  test("revogar a capacitação preenche revogado_em", async () => {
    const res = await fetch(`${BASE.workflowEngine}/skills/${draftId}/revoke/BMF-EXEC-001`, { method: "POST" });
    assert.equal(res.status, 200);
    const revogado = await res.json();
    assert.ok(revogado.revogado_em);
  });
});

describe("Learning Agent — Integração com Knowledge Base", () => {
  test("rascunho pode ser gerado a partir de um documento já ingerido, sem texto bruto", async () => {
    const referencia = `manual://teste-integracao/${Date.now()}`;
    const doc = await fetch(`${BASE.knowledgeBase}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenciaLogica: referencia, tipo: "manual", texto: "Processo de teste de integração entre Knowledge Base e Learning Agent." }),
    }).then((r) => r.json());

    const res = await fetch(`${BASE.workflowEngine}/skills/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomeProcesso: `Processo via KB ${Date.now()}`, documentoOrigemId: doc.documento.id }),
    });
    assert.equal(res.status, 201);
    const rascunho = await res.json();
    assert.equal(rascunho.documento_origem_id, doc.documento.id, "o rascunho deve manter rastreabilidade até o documento de origem");
  });

  test("sem texto e sem documentoOrigemId, o draft é rejeitado com 400", async () => {
    const res = await fetch(`${BASE.workflowEngine}/skills/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomeProcesso: "Processo sem fonte" }),
    });
    assert.equal(res.status, 400);
  });
});

describe("Learning Agent — Rejeição", () => {
  test("rejeitar um rascunho registra o motivo e o remove da fila", async () => {
    const criar = await fetch(`${BASE.workflowEngine}/skills/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomeProcesso: `Rejeitado ${Date.now()}`, textoDocumento: "texto insuficiente" }),
    });
    const rascunho = await criar.json();

    const rejeitar = await fetch(`${BASE.workflowEngine}/skills/${rascunho.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: "Fonte insuficiente" }),
    });
    assert.equal(rejeitar.status, 200);
    const rejeitado = await rejeitar.json();
    assert.equal(rejeitado.status_publicacao, "rejeitado");
    assert.equal(rejeitado.motivo_rejeicao, "Fonte insuficiente");

    const drafts = await fetch(`${BASE.workflowEngine}/skills/drafts`).then((r) => r.json());
    assert.ok(!drafts.some((d) => d.id === rascunho.id));
  });
});
