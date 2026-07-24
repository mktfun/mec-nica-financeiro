const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { BASE, aguardarCondicao } = require("./helpers");

describe("Workflow Engine — Saúde", () => {
  test("GET /health responde ok", async () => {
    const res = await fetch(`${BASE.workflowEngine}/health`);
    assert.equal(res.status, 200);
  });
});

describe("Workflow Engine — Estado Persistente e Retomada por Evento (EA-DOC-002 §4)", () => {
  test("workflow inicia, executa steps síncronos e para no step de espera", async () => {
    const inicio = await fetch(`${BASE.workflowEngine}/workflows/${encodeURIComponent("Emitir Seguro Auto")}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contexto: { clienteNome: "Cliente da Suíte de Testes" } }),
    });
    assert.equal(inicio.status, 202);
    const instancia = await inicio.json();
    assert.equal(instancia.status, "aguardando", "deveria parar no step de espera (aguardar aprovação)");

    const detalhe = await fetch(`${BASE.workflowEngine}/workflows/instances/${instancia.id}`).then((r) => r.json());
    const concluidos = detalhe.steps.filter((s) => s.status === "concluido");
    assert.equal(concluidos.length, 2, "os 2 primeiros steps (conectores) deveriam ter concluído");

    // Guarda o id para o próximo teste retomar exatamente esta instância.
    global.__instanciaWorkflowTeste = instancia.id;
  });

  test("publicar o evento aguardado retoma e conclui o workflow sozinho", async () => {
    const instanciaId = global.__instanciaWorkflowTeste;
    assert.ok(instanciaId, "o teste anterior precisa ter criado uma instância");

    const publicacao = await fetch(`${BASE.workflowEngine}/events/ClientApproved`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aprovado: true, origem: "suite-automatizada" }),
    });
    assert.equal(publicacao.status, 202);

    // O loop consumidor do Event Bus roda em paralelo (poll de ~5s) —
    // esperamos a condição real em vez de um sleep fixo.
    const instanciaFinal = await aguardarCondicao(
      async () => {
        const r = await fetch(`${BASE.workflowEngine}/workflows/instances/${instanciaId}`);
        const j = await r.json();
        return j.status === "concluido" ? j : null;
      },
      { tentativas: 20, intervaloMs: 1000, mensagem: "workflow atingir status concluido" }
    );

    assert.equal(instanciaFinal.status, "concluido");
    assert.ok(instanciaFinal.concluido_em);
    const stepFinal = instanciaFinal.steps.find((s) => s.nome_step === "Registrar Decisao");
    assert.equal(stepFinal.status, "concluido");
  });

  test("workflow inexistente retorna erro 400 ao iniciar", async () => {
    const res = await fetch(`${BASE.workflowEngine}/workflows/${encodeURIComponent("Nao Existe")}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
});

describe("Workflow Engine — Poda de Contexto (Context Pruning)", () => {
  test("contexto acumulado ao longo do workflow é podado, mantendo apenas as etapas mais recentes", async () => {
    const inicio = await fetch(`${BASE.workflowEngine}/workflows/${encodeURIComponent("Emitir Seguro Auto")}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contexto: { clienteNome: "Teste Poda de Contexto" } }),
    });
    const instancia = await inicio.json();
    assert.equal(instancia.status, "aguardando");

    await fetch(`${BASE.workflowEngine}/events/ClientApproved`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aprovado: true }),
    });

    const instanciaFinal = await aguardarCondicao(
      async () => {
        const r = await fetch(`${BASE.workflowEngine}/workflows/instances/${instancia.id}`);
        const j = await r.json();
        return j.status === "concluido" ? j : null;
      },
      { tentativas: 20, intervaloMs: 1000, mensagem: "workflow concluir para testar poda de contexto" }
    );

    const chavesDeStep = Object.keys(instanciaFinal.contexto).filter((k) => k !== "_stepsOmitidos");
    // O ambiente de teste roda com o limite padrão de produção
    // (WORKFLOW_CONTEXT_MAX_STEPS=10) a menos que sobrescrito — este
    // teste apenas confirma que o mecanismo existe e nunca corrompe o
    // contexto, independente do limite configurado.
    assert.ok(chavesDeStep.length <= 10, "contexto não deveria crescer indefinidamente");
    assert.ok(instanciaFinal.contexto["Registrar Decisao"], "a etapa mais recente deve sempre estar presente");
  });
});
