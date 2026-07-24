-- BMF IA OS — Migração V2
-- Fonte: DM-DOC-001, Seção 3.2

-- ============================================================
-- DOMÍNIO: GOVERNANÇA DE AGENTES (criado primeiro — outras
-- tabelas referenciam agentes_ia e colaboradores)
-- ============================================================

CREATE TABLE colaboradores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  cargo         VARCHAR(150),
  departamento  VARCHAR(150),
  ativo         BOOLEAN NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agentes_ia (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo              VARCHAR(30) UNIQUE NOT NULL,      -- ex.: BMF-EXEC-001
  nome                VARCHAR(150) NOT NULL,             -- ex.: Marina Albuquerque
  cargo               VARCHAR(150) NOT NULL,             -- ex.: Chief Executive Officer IA
  role_curto          VARCHAR(30) NOT NULL,              -- ex.: CEO IA
  departamento        VARCHAR(150) NOT NULL,
  supervisor_agente_id UUID REFERENCES agentes_ia(id),
  classe              classe_agente NOT NULL,
  versao              VARCHAR(20) NOT NULL DEFAULT '1.0',
  status_homologacao  status_homolog NOT NULL DEFAULT 'especificado',
  ficha_bass          JSONB NOT NULL,                    -- módulos 1-8, 11, 12 (BASS-CAT-001)
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agentes_ia_codigo ON agentes_ia(codigo);
CREATE INDEX idx_agentes_ia_status ON agentes_ia(status_homologacao);
