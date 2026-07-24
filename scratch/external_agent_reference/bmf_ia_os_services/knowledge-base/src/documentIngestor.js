const { query } = require("./db");
const { dividirEmChunks } = require("./chunker");
const { gerarEmbedding } = require("./embedder");

/**
 * Document Ingestor (C4-DOC-002, Secao 1)
 * Recebe um documento (texto já extraído — a extração de PDF/imagem
 * em si continua fora do escopo deste serviço, ver LOCAL-AGENT-DOC-001
 * e SKILL-SPEC-001, que usaram OCR externo), cria o registro em
 * `documentos`, aplica o Chunker e o Embedder, e grava cada trecho em
 * `conhecimento_embeddings`.
 *
 * Também aplica o versionamento definido em EA-DOC-003 (Secao 4 —
 * Knowledge Manager): se já existir um documento ativo com a mesma
 * referência lógica, ele é marcado como 'superado' e o evento fica
 * registrado em documentos_historico, preservando rastreabilidade.
 */

async function ingerir({ referenciaLogica, tipo, texto, ownerDepartamento, dataRevisaoObrigatoria }) {
  if (!referenciaLogica || !texto) {
    throw new Error("referenciaLogica e texto são obrigatórios.");
  }

  const existenteRes = await query(
    `SELECT id, versao FROM documentos WHERE url_storage = $1 AND status = 'ativo' ORDER BY versao DESC LIMIT 1`,
    [referenciaLogica]
  );
  const existente = existenteRes.rows[0];
  const novaVersao = existente ? existente.versao + 1 : 1;

  const novoDocRes = await query(
    `INSERT INTO documentos (tipo, url_storage, versao, owner_departamento, data_revisao_obrigatoria, status)
     VALUES ($1, $2, $3, $4, $5, 'ativo')
     RETURNING *`,
    [tipo || "manual", referenciaLogica, novaVersao, ownerDepartamento || null, dataRevisaoObrigatoria || null]
  );
  const novoDoc = novoDocRes.rows[0];

  if (existente) {
    await query(`UPDATE documentos SET status = 'superado' WHERE id = $1`, [existente.id]);
    await query(
      `INSERT INTO documentos_historico (documento_id, versao_anterior, url_storage_anterior)
       VALUES ($1, $2, $3)`,
      [novoDoc.id, existente.versao, referenciaLogica]
    );
  }

  const chunks = dividirEmChunks(texto);
  let simuladoUsado = false;

  for (const chunkTexto of chunks) {
    const { vetor, simulado } = await gerarEmbedding(chunkTexto);
    simuladoUsado = simuladoUsado || simulado;
    const vetorStr = `[${vetor.join(",")}]`;
    await query(
      `INSERT INTO conhecimento_embeddings (documento_id, chunk_texto, embedding, metadata)
       VALUES ($1, $2, $3::vector, $4)`,
      [novoDoc.id, chunkTexto, vetorStr, JSON.stringify({ referenciaLogica, versao: novaVersao })]
    );
  }

  return {
    documento: novoDoc,
    versaoAnterior: existente ? existente.versao : null,
    chunksGerados: chunks.length,
    embeddingSimulado: simuladoUsado,
  };
}

/**
 * Reconstroi o texto completo de um documento a partir de seus chunks,
 * na ordem em que foram gravados — usado pelo Learning Agent para
 * consumir um documento já ingerido sem precisar receber o texto
 * bruto de novo.
 */
async function obterTextoCompleto(documentoId) {
  const { rows } = await query(
    `SELECT chunk_texto FROM conhecimento_embeddings WHERE documento_id = $1 ORDER BY criado_em`,
    [documentoId]
  );
  return rows.map((r) => r.chunk_texto).join("\n\n");
}

module.exports = { ingerir, obterTextoCompleto };
