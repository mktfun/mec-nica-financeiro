const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { BASE } = require("./helpers");

/**
 * Testa o Context Compressor (agent-runtime/src/contextCompressor.js).
 * Assume que o agent-runtime foi iniciado com CONTEXT_COMPRESSOR_LIMITE=6
 * e CONTEXT_COMPRESSOR_MANTER=2 (ver README.md — variáveis de ambiente
 * para tornar o teste rápido e determinístico, mesmo padrão já usado
 * para SANDBOX_TIMEOUT_MS).
 */

async function executar(conversaId, texto) {
  const res = await fetch(`${BASE.agentRuntime}/agents/BMF-EXEC-001/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objetivo: texto, conversaId }),
  });
  return res.json();
}

async function lerSessao(conversaId) {
  const res = await fetch(`${BASE.agentRuntime}/agents/BMF-EXEC-001/sessions/${conversaId}`);
  return res.json();
}

describe("Context Compressor", () => {
  test("sessão curta não é comprimida", async () => {
    const conversaId = `suite-curta-${Date.now()}`;
    const resp = await executar(conversaId, "Primeira mensagem");
    assert.equal(resp.compressaoContexto.comprimido, false);
  });

  test("sessão longa é comprimida automaticamente, mantendo mensagens recentes verbatim", async () => {
    const conversaId = `suite-longa-${Date.now()}`;
    let ultimaResposta;
    for (let i = 1; i <= 4; i++) {
      ultimaResposta = await executar(conversaId, `Mensagem de teste número ${i}`);
    }
    assert.equal(ultimaResposta.compressaoContexto.comprimido, true);

    const sessao = await lerSessao(conversaId);
    assert.ok(sessao.tamanho < 8, "sessão comprimida deve ser bem menor que as 8 mensagens originais");

    const resumos = sessao.historico.filter((m) => m.role === "system");
    assert.equal(resumos.length, 1, "deve haver exatamente 1 mensagem de resumo");
    assert.match(resumos[0].content, /^\[RESUMO DA CONVERSA\]/);

    const ultimaMsgUsuario = sessao.historico.filter((m) => m.role === "user").pop();
    assert.match(ultimaMsgUsuario.content, /número 4/, "a mensagem mais recente deve permanecer verbatim, não resumida");
  });

  test("múltiplos ciclos de compressão nunca acumulam mais de 1 resumo", async () => {
    const conversaId = `suite-multipla-${Date.now()}`;
    for (let i = 1; i <= 8; i++) {
      await executar(conversaId, `Mensagem número ${i}`);
    }
    const sessao = await lerSessao(conversaId);
    const resumos = sessao.historico.filter((m) => m.role === "system");
    assert.equal(resumos.length, 1, "mesmo após vários ciclos de compressão, deve haver só 1 resumo, não um por ciclo");
  });
});
