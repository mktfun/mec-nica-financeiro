-- BMF IA OS — Migração V6
-- Fonte: DM-DOC-001, Seção 3.6

-- ============================================================
-- DOMÍNIO: INDICADORES
-- ============================================================

CREATE TABLE indicadores_historico (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_kpi     VARCHAR(150) NOT NULL,
  departamento VARCHAR(150) NOT NULL,
  agente_id    UUID REFERENCES agentes_ia(id),
  valor        NUMERIC(18,4) NOT NULL,
  meta         NUMERIC(18,4),
  periodo      DATE NOT NULL,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_indicadores_kpi_periodo ON indicadores_historico(nome_kpi, periodo);
-- Alimenta os KPIs de cada agente (BASS Módulo 11) e o Painel
-- Executivo do CEO IA (EA-DOC-001, Seção 13).
