require("dotenv").config();
const express = require("express");
const { pool, query } = require("./db");
const documentIngestor = require("./documentIngestor");
const vectorSearch = require("./vectorSearch");
const ragAssembler = require("./ragAssembler");

const app = express();
app.use(express.json({ limit: "10mb" }));
const PORT = process.env.PORT || 8085;

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "knowledge-base" });
  } catch (err) {
    res.status(503).json({ status: "erro", detalhe: err.message });
  }
});

// Document Ingestor
app.post("/documents", async (req, res) => {
  const { referenciaLogica, tipo, texto, ownerDepartamento, dataRevisaoObrigatoria } = req.body;
  try {
    const resultado = await documentIngestor.ingerir({ referenciaLogica, tipo, texto, ownerDepartamento, dataRevisaoObrigatoria });
    res.status(201).json(resultado);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

app.get("/documents/:id/text", async (req, res) => {
  const texto = await documentIngestor.obterTextoCompleto(req.params.id);
  res.json({ documentoId: req.params.id, texto });
});

app.get("/documents/:id/chunks", async (req, res) => {
  const { rows } = await query(
    `SELECT id, chunk_texto, metadata, criado_em FROM conhecimento_embeddings WHERE documento_id = $1 ORDER BY criado_em`,
    [req.params.id]
  );
  res.json(rows);
});

app.get("/documents", async (req, res) => {
  const { rows } = await query(
    `SELECT id, tipo, url_storage, versao, owner_departamento, status, criado_em
     FROM documentos WHERE url_storage IS NOT NULL ORDER BY url_storage, versao DESC`
  );
  res.json(rows);
});

app.get("/documents/:referenciaLogica/history", async (req, res) => {
  const { rows } = await query(
    `SELECT dh.versao_anterior, dh.url_storage_anterior, dh.substituido_em, dh.documento_id
     FROM documentos_historico dh
     JOIN documentos d ON d.id = dh.documento_id
     WHERE d.url_storage = $1
     ORDER BY dh.substituido_em`,
    [req.params.referenciaLogica]
  );
  res.json(rows);
});

// Vector Search
app.post("/search", async (req, res) => {
  const { query: textoConsulta, k } = req.body;
  if (!textoConsulta) return res.status(400).json({ erro: "campo_query_obrigatorio" });
  try {
    const resultado = await vectorSearch.buscar(textoConsulta, k || 5);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// RAG Assembler
app.post("/rag/query", async (req, res) => {
  const { pergunta, codigoAgente, k } = req.body;
  if (!pergunta || !codigoAgente) {
    return res.status(400).json({ erro: "campos_obrigatorios", detalhe: "pergunta e codigoAgente são obrigatórios" });
  }
  try {
    const resultado = await ragAssembler.responderComBaseEmDocumentos({ pergunta, codigoAgente, k: k || 5 });
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[knowledge-base] escutando na porta ${PORT}`);
  console.log(`[knowledge-base] VOYAGE_API_KEY ${process.env.VOYAGE_API_KEY ? "configurada" : "AUSENTE — embeddings em modo simulado"}`);
});

module.exports = app;
