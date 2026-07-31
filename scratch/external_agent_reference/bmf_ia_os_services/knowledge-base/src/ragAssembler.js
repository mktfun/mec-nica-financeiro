const fetch = require("node-fetch");
const vectorSearch = require("./vectorSearch");

/**
 * RAG Assembler (C4-DOC-002, Secao 1)
 * Monta o contexto relevante a partir do Vector Search e, quando um
 * agente é informado, delega a resposta ao Agent Runtime já existente
 * — com o contexto recuperado embutido no objetivo, para que a
 * resposta seja aterrada em documento real, não apenas na memória do
 * modelo. Isso é a mitigação estrutural contra alucinação discutida
 * com o Conselho Executivo: nenhuma trava de tamanho de contexto
 * substitui isto, mas isto reduz a causa raiz que uma trava sozinha
 * não alcança.
 */

const AGENT_RUNTIME_URL = process.env.AGENT_RUNTIME_URL || "http://localhost:8081";

function montarContexto(resultadosBusca) {
  if (resultadosBusca.length === 0) {
    return "Nenhum trecho relevante foi encontrado na base de conhecimento para esta pergunta.";
  }
  return resultadosBusca
    .map((r, i) => `[Fonte ${i + 1} — ${r.url_storage}, v${r.versao}, distância ${r.distancia.toFixed(4)}]\n${r.chunk_texto}`)
    .join("\n\n---\n\n");
}

/**
 * Responde a uma pergunta com base apenas no que foi recuperado da
 * base de conhecimento — se nenhum trecho relevante for encontrado,
 * o agente é instruído a dizer isso explicitamente, em vez de
 * inventar uma resposta a partir da memória do modelo.
 */
async function responderComBaseEmDocumentos({ pergunta, codigoAgente, k = 5 }) {
  const { resultados, embeddingSimulado } = await vectorSearch.buscar(pergunta, k);
  const contexto = montarContexto(resultados);

  const objetivo = [
    "Responda à pergunta do usuário usando EXCLUSIVAMENTE as fontes abaixo, recuperadas da base de conhecimento.",
    "Se as fontes não contiverem a resposta, diga explicitamente que não há informação suficiente na base — não invente.",
    "Cite a fonte (ex.: \"Fonte 1\") ao afirmar algo que vem dela.",
    "",
    `Pergunta: ${pergunta}`,
    "",
    "Fontes recuperadas:",
    contexto,
  ].join("\n");

  const resposta = await fetch(`${AGENT_RUNTIME_URL}/agents/${codigoAgente}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objetivo }),
  }).then((r) => r.json());

  return {
    pergunta,
    resposta: resposta.resultado || resposta.erro,
    fontesUtilizadas: resultados.map((r) => ({ documentoId: r.documento_id, referencia: r.url_storage, versao: r.versao, distancia: r.distancia })),
    embeddingSimulado,
    statusExecucao: resposta.status || "erro",
  };
}

module.exports = { montarContexto, responderComBaseEmDocumentos };
