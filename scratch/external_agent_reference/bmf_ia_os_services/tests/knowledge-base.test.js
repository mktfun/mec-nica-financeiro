const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { BASE } = require("./helpers");

const KB_URL = BASE.knowledgeBase;

describe("Knowledge Base Service — Saúde", () => {
  test("GET /health responde ok", async () => {
    const res = await fetch(`${KB_URL}/health`);
    assert.equal(res.status, 200);
  });
});

describe("Knowledge Base Service — Ingestão e Chunking", () => {
  const referencia = `manual://teste-suite/${Date.now()}`;

  test("POST /documents ingere um documento e gera ao menos 1 chunk", async () => {
    const res = await fetch(`${KB_URL}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referenciaLogica: referencia,
        tipo: "manual",
        ownerDepartamento: "Teste",
        texto: "Este é um documento de teste da suíte automatizada. Ele contém informação sobre um processo fictício de teste.",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.documento.versao, 1);
    assert.ok(body.chunksGerados >= 1);
  });

  test("documento aparece em GET /documents", async () => {
    const res = await fetch(`${KB_URL}/documents`);
    const lista = await res.json();
    assert.ok(lista.some((d) => d.url_storage === referencia));
  });
});

describe("Knowledge Base Service — Busca Vetorial", () => {
  const referencia = `manual://teste-busca/${Date.now()}`;
  const textoOriginal = "Processo exclusivo de teste de busca vetorial da suíte automatizada, com conteúdo específico e identificável.";

  test("busca por texto idêntico ao ingerido retorna distância mínima (0)", async () => {
    await fetch(`${KB_URL}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenciaLogica: referencia, tipo: "manual", texto: textoOriginal }),
    });

    const res = await fetch(`${KB_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: textoOriginal, k: 1 }),
    });
    const body = await res.json();
    assert.ok(body.resultados.length >= 1);
    assert.equal(body.resultados[0].distancia, 0, "texto idêntico deveria ter distância exatamente 0");
  });
});

describe("Knowledge Base Service — Versionamento (EA-DOC-003 §4)", () => {
  const referencia = `manual://teste-versao/${Date.now()}`;

  test("ingerir a mesma referência lógica duas vezes cria v2 e marca v1 como superado", async () => {
    const v1 = await fetch(`${KB_URL}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenciaLogica: referencia, tipo: "manual", texto: "Conteúdo da versão 1 do documento de teste." }),
    }).then((r) => r.json());
    assert.equal(v1.documento.versao, 1);

    const v2 = await fetch(`${KB_URL}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenciaLogica: referencia, tipo: "manual", texto: "Conteúdo da versão 2, atualizado, do documento de teste." }),
    }).then((r) => r.json());
    assert.equal(v2.documento.versao, 2);
    assert.equal(v2.versaoAnterior, 1);

    const historico = await fetch(`${KB_URL}/documents/${encodeURIComponent(referencia)}/history`).then((r) => r.json());
    assert.ok(historico.some((h) => h.versao_anterior === 1));
  });

  test("busca não retorna mais chunks da versão superada", async () => {
    const res = await fetch(`${KB_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Conteúdo da versão 1 do documento de teste.", k: 5 }),
    });
    const body = await res.json();
    const referenciaEncontrada = body.resultados.find((r) => r.url_storage === referencia);
    if (referenciaEncontrada) {
      assert.equal(referenciaEncontrada.versao, 2, "se a referência aparecer, deve ser sempre a versão ativa (2), nunca a 1 (superada)");
    }
  });
});

describe("Knowledge Base Service — RAG Assembler", () => {
  test("POST /rag/query aterra a resposta do agente nos documentos recuperados", async () => {
    const referencia = `manual://teste-rag/${Date.now()}`;
    await fetch(`${KB_URL}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenciaLogica: referencia, tipo: "manual", texto: "Para testar o RAG, envie uma pergunta relacionada a este texto específico e único." }),
    });

    const res = await fetch(`${KB_URL}/rag/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta: "Como testar o RAG?", codigoAgente: "BMF-EXEC-001", k: 1 }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.fontesUtilizadas.length > 0);
    assert.notEqual(body.statusExecucao, "erro", "consulta válida a um agente homologado não deveria reportar erro");
  });

  test("agente inexistente é reportado como erro de verdade (não mascarado)", async () => {
    const res = await fetch(`${KB_URL}/rag/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta: "teste", codigoAgente: "BMF-NAO-EXISTE", k: 1 }),
    });
    const body = await res.json();
    assert.equal(body.statusExecucao, "erro");
  });
});
