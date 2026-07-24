-- BMF IA OS — Migração V3
-- Fonte: DM-DOC-001, Seção 3.3

CREATE TABLE permissoes_ferramentas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id     UUID NOT NULL REFERENCES agentes_ia(id) ON DELETE CASCADE,
  ferramenta    VARCHAR(150) NOT NULL,
  permissao     nivel_permissao NOT NULL,
  UNIQUE (agente_id, ferramenta)
);
-- Backing table do Tool Broker (C4-DOC-001, Seção 4.2): o Agent
-- Executor só invoca uma ferramenta se existir uma linha aqui
-- com permissao <> 'negado' para o agente em questão.

CREATE TABLE homologacoes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id           UUID NOT NULL REFERENCES agentes_ia(id) ON DELETE CASCADE,
  teste_tecnico        BOOLEAN NOT NULL DEFAULT false,
  teste_funcional       BOOLEAN NOT NULL DEFAULT false,
  teste_seguranca       BOOLEAN NOT NULL DEFAULT false,
  teste_governanca      BOOLEAN NOT NULL DEFAULT false,
  teste_performance     BOOLEAN NOT NULL DEFAULT false,
  aprovado_em          TIMESTAMPTZ,
  aprovado_por_colaborador_id UUID REFERENCES colaboradores(id),
  observacoes          TEXT
);
-- Backing table do Homologation Gate (C4-DOC-001, BASS Módulo 15).
-- agentes_ia.status_homologacao só muda para 'homologado' quando
-- os 5 campos de teste acima estiverem todos true.

CREATE TABLE memoria_agentes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id     UUID NOT NULL REFERENCES agentes_ia(id) ON DELETE CASCADE,
  tipo          tipo_memoria NOT NULL,
  conteudo      JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memoria_agente ON memoria_agentes(agente_id, tipo);
-- Guarda apenas memória Permanente e de Aprendizado (BASS Módulo
-- 10). Memória Operacional e de Sessão vivem no Redis (Seção 5.3)
-- por exigirem baixa latência e não precisarem de durabilidade.

CREATE TABLE auditoria (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_hora         TIMESTAMPTZ NOT NULL DEFAULT now(),
  agente_id         UUID REFERENCES agentes_ia(id),
  colaborador_id    UUID REFERENCES colaboradores(id),
  ferramenta        VARCHAR(150),
  objetivo          TEXT NOT NULL,
  resultado         TEXT,
  tempo_execucao_ms INTEGER,
  status            VARCHAR(30) NOT NULL
);
CREATE INDEX idx_auditoria_agente ON auditoria(agente_id, data_hora);
-- Backing table do Audit Logger (C4-DOC-001, BASS Módulo 14).
-- Toda execução do Agent Executor grava uma linha aqui.
