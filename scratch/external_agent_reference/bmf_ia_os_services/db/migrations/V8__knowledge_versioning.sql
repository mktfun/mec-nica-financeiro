-- BMF IA OS — Migração V8
-- Fonte: EA-DOC-003, Secao 4 (Knowledge Manager)
-- Versionamento e ciclo de vida de documentos na base de conhecimento.
-- Nota: o Knowledge Base Service (Document Ingestor, Chunker, Embedder,
-- Vector Search, RAG Assembler) em si, especificado em C4-DOC-002 §1,
-- ainda nao tem codigo implementado — permanece no backlog. Esta
-- migracao apenas prepara o esquema para quando isso for construido.

ALTER TABLE documentos
  ADD COLUMN versao INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN owner_departamento VARCHAR(150),
  ADD COLUMN data_revisao_obrigatoria DATE,
  ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'ativo';  -- ativo | requer_revisao | superado

CREATE TABLE documentos_historico (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id    UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  versao_anterior INTEGER NOT NULL,
  url_storage_anterior VARCHAR(500),
  substituido_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
