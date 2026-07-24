-- BMF IA OS — Migração V5
-- Fonte: DM-DOC-001, Seção 3.5

-- ============================================================
-- DOMÍNIO: CONHECIMENTO (Knowledge Base Service, C4-DOC-001 §3)
-- ============================================================

CREATE TABLE documentos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo               VARCHAR(100) NOT NULL,     -- ex.: apolice_pdf, procedimento, faq
  referencia_tabela  VARCHAR(100),               -- ex.: 'apolices' (referência polimórfica)
  referencia_id      UUID,
  url_storage        VARCHAR(500) NOT NULL,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documentos_ref ON documentos(referencia_tabela, referencia_id);

CREATE TABLE conhecimento_embeddings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id   UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  chunk_texto    TEXT NOT NULL,
  embedding      VECTOR(1536) NOT NULL,
  metadata       JSONB,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_embeddings_vector ON conhecimento_embeddings
  USING hnsw (embedding vector_cosine_ops);
-- Índice HNSW do pgvector para busca semântica (RAG) — ADR-001
-- do C4-DOC-001: mesmo motor local e cloud, sem vector DB dedicado.
