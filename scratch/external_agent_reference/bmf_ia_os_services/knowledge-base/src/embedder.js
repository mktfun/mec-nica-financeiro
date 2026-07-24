const fetch = require("node-fetch");
const crypto = require("crypto");

/**
 * Embedder (C4-DOC-002, Secao 1)
 * Gera o vetor de cada chunk. Suporta a Voyage AI (parceira de
 * embeddings recomendada pela Anthropic) quando VOYAGE_API_KEY está
 * configurada; caso contrário, opera em modo simulado — mesmo padrão
 * de "modo simulado sem custo de API" já usado no Agent Executor, no
 * Learning Agent e no Context Compressor.
 *
 * IMPORTANTE: o modo simulado gera vetores deterministicos a partir
 * de hash do texto — eles permitem testar TODO o pipeline de
 * armazenamento e busca (mecânica correta), mas NÃO têm significado
 * semântico real. Busca por similaridade em modo simulado só é
 * confiável para o caso "texto igual encontra texto igual" — não
 * reflete similaridade de significado. Um provedor real é necessário
 * para RAG semântico de verdade em produção.
 */

const DIMENSOES = 1536; // precisa bater com conhecimento_embeddings.embedding VECTOR(1536), DM-DOC-001 §3.5
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_MODEL = process.env.VOYAGE_MODEL || "voyage-2";

function ajustarDimensao(vetor, alvo) {
  if (vetor.length === alvo) return vetor;
  if (vetor.length > alvo) return vetor.slice(0, alvo);
  return [...vetor, ...new Array(alvo - vetor.length).fill(0)];
}

function embeddingSimulado(texto) {
  const vetor = new Array(DIMENSOES);
  let seed = crypto.createHash("sha256").update(texto).digest();
  for (let i = 0; i < DIMENSOES; i++) {
    if (i > 0 && i % seed.length === 0) {
      seed = crypto.createHash("sha256").update(seed).digest();
    }
    vetor[i] = (seed[i % seed.length] / 255) * 2 - 1; // valores entre -1 e 1
  }
  return vetor;
}

async function gerarEmbedding(texto) {
  if (!texto || !texto.trim()) {
    throw new Error("Texto vazio não pode ser transformado em embedding.");
  }

  if (VOYAGE_API_KEY) {
    const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${VOYAGE_API_KEY}` },
      body: JSON.stringify({ input: [texto], model: VOYAGE_MODEL }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(`Voyage API retornou erro: ${JSON.stringify(data)}`);
    }
    return { vetor: ajustarDimensao(data.data[0].embedding, DIMENSOES), simulado: false, provedor: VOYAGE_MODEL };
  }

  return { vetor: embeddingSimulado(texto), simulado: true, provedor: "simulado-hash-sha256" };
}

module.exports = { gerarEmbedding, embeddingSimulado, DIMENSOES };
