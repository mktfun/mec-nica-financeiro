const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { BASE, CLIENTE_TESTE_ID, jsonOuTexto } = require("./helpers");

describe("Agent Runtime — Saúde e Registro", () => {
  test("GET /health responde ok, com banco e Redis conectados", async () => {
    const res = await fetch(`${BASE.agentRuntime}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.equal(body.db, "conectado");
    assert.equal(body.redis, "conectado");
  });

  test("GET /agents lista o CEO IA cadastrado", async () => {
    const res = await fetch(`${BASE.agentRuntime}/agents`);
    const agentes = await res.json();
    const ceo = agentes.find((a) => a.codigo === "BMF-EXEC-001");
    assert.ok(ceo, "BMF-EXEC-001 (CEO IA) deveria estar no Agent Registry");
    assert.equal(ceo.role_curto, "CEO IA");
  });
});

describe("Agent Runtime — Homologation Gate", () => {
  test("agente homologado (CEO IA) é liberado", async () => {
    const res = await fetch(`${BASE.agentRuntime}/agents/BMF-EXEC-001/homologacao`);
    const body = await res.json();
    assert.equal(body.homologado, true);
  });

  test("agente não homologado (CXO IA) é bloqueado", async () => {
    const res = await fetch(`${BASE.agentRuntime}/agents/BMF-EXEC-004/homologacao`);
    const body = await res.json();
    assert.equal(body.homologado, false);
  });

  test("POST /execute retorna 403 para agente não homologado", async () => {
    const res = await fetch(`${BASE.agentRuntime}/agents/BMF-EXEC-004/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objetivo: "Tarefa de teste" }),
    });
    assert.equal(res.status, 403);
    const body = await jsonOuTexto(res);
    assert.equal(body.erro, "agente_nao_homologado");
  });

  test("POST /execute funciona (modo simulado) para agente homologado", async () => {
    const res = await fetch(`${BASE.agentRuntime}/agents/BMF-EXEC-001/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objetivo: "Tarefa de teste automatizado", conversaId: "suite-conv-1" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.resultado, "deveria retornar algum resultado (simulado ou real)");
    assert.ok(["sucesso", "simulado"].includes(body.status));
  });
});

describe("Agent Runtime — Tool Broker (RBAC)", () => {
  test("ferramenta autorizada é concedida", async () => {
    const ferramenta = encodeURIComponent("Painel Executivo (BI)");
    const res = await fetch(`${BASE.agentRuntime}/agents/BMF-EXEC-001/tools/${ferramenta}`, { method: "POST" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.concedido, true);
  });

  test("ferramenta não autorizada é bloqueada com 403", async () => {
    const ferramenta = encodeURIComponent("ERP Financeiro");
    const res = await fetch(`${BASE.agentRuntime}/agents/BMF-EXEC-001/tools/${ferramenta}`, { method: "POST" });
    assert.equal(res.status, 403);
    const body = await jsonOuTexto(res);
    assert.equal(body.erro, "ferramenta_nao_autorizada");
  });
});

describe("Agent Runtime — Business Memory (EA-DOC-003 §6)", () => {
  test("agente com permissão registra memória sobre um cliente", async () => {
    const res = await fetch(`${BASE.agentRuntime}/business-memory/BMF-EXEC-001/${CLIENTE_TESTE_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoria: "preferencia",
        conteudo: { nota: "Prefere contato por WhatsApp (registrado pela suíte de testes)" },
        confianca: "declarada",
      }),
    });
    assert.equal(res.status, 201);
  });

  test("um agente DIFERENTE consegue ler a mesma memória", async () => {
    const res = await fetch(`${BASE.agentRuntime}/business-memory/BMF-EXEC-004/${CLIENTE_TESTE_ID}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.registros.length > 0, "CXO IA deveria enxergar memória registrada pelo CEO IA");
    assert.ok(body.registros.some((r) => r.categoria === "preferencia"));
    assert.ok(typeof body.total === "number");
  });

  test("agente sem permissão é bloqueado com 403", async () => {
    const res = await fetch(`${BASE.agentRuntime}/business-memory/BMF-EXEC-999/${CLIENTE_TESTE_ID}`);
    assert.equal(res.status, 403);
    const body = await jsonOuTexto(res);
    assert.equal(body.erro, "sem_permissao_memoria_negocio");
  });

  test("leitura é limitada e sinaliza truncamento quando há mais registros do que o limite", async () => {
    // Categoria única por execução — evita que reexecuções da suíte
    // acumulem registros de rodadas anteriores e quebrem a contagem exata.
    const categoriaUnica = `teste_limite_${Date.now()}`;
    for (let i = 0; i < 6; i++) {
      await fetch(`${BASE.agentRuntime}/business-memory/BMF-EXEC-001/${CLIENTE_TESTE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria: categoriaUnica, conteudo: { i }, confianca: "declarada" }),
      });
    }

    const res = await fetch(`${BASE.agentRuntime}/business-memory/BMF-EXEC-001/${CLIENTE_TESTE_ID}?categoria=${categoriaUnica}&limite=3`);
    const body = await res.json();
    assert.equal(body.registros.length, 3, "deve devolver apenas 3 registros (o limite pedido)");
    assert.equal(body.total, 6, "mas o total real deve refletir os 6 registros existentes");
    assert.equal(body.truncado, true);
  });
});
