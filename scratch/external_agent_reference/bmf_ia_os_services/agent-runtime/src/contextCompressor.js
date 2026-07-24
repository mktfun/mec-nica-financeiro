const Anthropic = require("@anthropic-ai/sdk");
const memory = require("./memoryManager");

/**
 * Context Compressor (gap identificado em conversa com o Conselho
 * Executivo: memoria de Sessao crescia sem limite, sem nenhum
 * mecanismo de resumo — o mesmo papel que o context_compressor.py
 * do Hermes Agent cumpre no projeto de referencia, LOCAL-AGENT-DOC-001).
 *
 * Quando o historico de uma conversa ultrapassa um limite de
 * mensagens, as mensagens mais antigas sao substituidas por um unico
 * resumo gerado por IA; as mensagens mais recentes permanecem
 * verbatim. Isso mantem o prompt de cada chamada limitado, reduzindo
 * custo, latencia, e o risco de o modelo perder o fio da conversa em
 * excesso de contexto (que pode se manifestar como alucinacao).
 */

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const LIMITE_MENSAGENS = Number(process.env.CONTEXT_COMPRESSOR_LIMITE) || 20;
const MANTER_RECENTES = Number(process.env.CONTEXT_COMPRESSOR_MANTER) || 6;
const MARCADOR_RESUMO = "[RESUMO DA CONVERSA]";

function ehResumo(mensagem) {
  return mensagem && mensagem.role === "system" && typeof mensagem.content === "string" && mensagem.content.startsWith(MARCADOR_RESUMO);
}

async function gerarResumo(texto) {
  if (!anthropic) {
    // Modo simulado: determinístico, sem custo de API, permite testar
    // o pipeline de compressão de ponta a ponta sem ANTHROPIC_API_KEY —
    // mesmo padrão já usado no Agent Executor e no Learning Agent.
    const linhas = texto.split("\n").length;
    return `[SIMULADO — defina ANTHROPIC_API_KEY para resumo real] Resumo de ${linhas} mensagens anteriores da conversa.`;
  }

  const resposta = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    system: "Resuma a conversa abaixo em no máximo 5 frases, preservando decisões tomadas, dados fornecidos pelo cliente e pendências em aberto. Não invente informação que não esteja no texto.",
    messages: [{ role: "user", content: texto }],
  });
  return resposta.content.map((b) => (b.type === "text" ? b.text : "")).join(" ").trim();
}

/**
 * Verifica o tamanho da sessão e comprime se necessário. Chamada pelo
 * Agent Executor logo após cada execução — nunca durante a montagem
 * do prompt em si, para não atrasar a resposta ao cliente.
 */
async function comprimirSeNecessario(agenteId, conversaId) {
  const historico = await memory.lerSessao(agenteId, conversaId);

  if (historico.length <= LIMITE_MENSAGENS) {
    return { comprimido: false, tamanho: historico.length };
  }

  const jaTinhaResumo = ehResumo(historico[0]);
  const corpo = jaTinhaResumo ? historico.slice(1) : historico;

  if (corpo.length <= MANTER_RECENTES) {
    return { comprimido: false, tamanho: historico.length };
  }

  const recentes = corpo.slice(corpo.length - MANTER_RECENTES);
  const antigas = corpo.slice(0, corpo.length - MANTER_RECENTES);

  const textoAntigas = antigas.map((m) => `${m.role}: ${m.content}`).join("\n");
  const textoParaResumir = jaTinhaResumo
    ? `${historico[0].content.replace(MARCADOR_RESUMO, "").trim()}\n\nMensagens adicionais a incorporar:\n${textoAntigas}`
    : textoAntigas;

  const novoResumo = await gerarResumo(textoParaResumir);

  const novoHistorico = [
    { role: "system", content: `${MARCADOR_RESUMO} ${novoResumo}`, timestamp: new Date().toISOString() },
    ...recentes,
  ];

  await memory.sobrescreverSessao(agenteId, conversaId, novoHistorico);

  return {
    comprimido: true,
    tamanhoAntes: historico.length,
    tamanhoDepois: novoHistorico.length,
    mensagensResumidas: antigas.length,
  };
}

module.exports = { comprimirSeNecessario, gerarResumo, ehResumo, LIMITE_MENSAGENS, MANTER_RECENTES };
