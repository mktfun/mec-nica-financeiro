const { query } = require("./db");
const { gerarEmbedding } = require("./embedder");

/**
 * Vector Search (C4-DOC-002, Secao 1)
 * Busca por similaridade usando o indice HNSW do pgvector, ja criado
 * na migracao V5 (DM-DOC-001 §3.5) — operador <=> (distancia por
 * cosseno). Retorna apenas trechos de documentos com status 'ativo'
 * (documentos 'superado' nao entram na busca, mesmo que ainda
 * existam no historico).
 */

async function buscar(textoConsulta, k = 5) {
  const { vetor, simulado } = await gerarEmbedding(textoConsulta);
  const vetorStr = `[${vetor.join(",")}]`;

  const { rows } = await query(
    `SELECT ce.id, ce.documento_id, ce.chunk_texto, ce.metadata,
            d.tipo, d.owner_departamento, d.versao, d.url_storage,
            (ce.embedding <=> $1::vector) AS distancia
     FROM conhecimento_embeddings ce
     JOIN documentos d ON d.id = ce.documento_id
     WHERE d.status = 'ativo'
     ORDER BY ce.embedding <=> $1::vector
     LIMIT $2`,
    [vetorStr, k]
  );

  return { resultados: rows, embeddingSimulado: simulado };
}

module.exports = { buscar };
