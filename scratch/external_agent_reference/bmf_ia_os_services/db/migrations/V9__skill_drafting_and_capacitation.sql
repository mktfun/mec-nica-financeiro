-- BMF IA OS — Migração V9
-- Fonte: PROC-LEARN-DOC-001, Secoes 5-6
-- Suporte ao pipeline do Learning Agent IA: rascunho -> revisao -> publicacao

ALTER TABLE workflow_definitions
  ADD COLUMN status_publicacao VARCHAR(20) NOT NULL DEFAULT 'rascunho',
    -- rascunho | em_revisao | aprovado | ativo | rejeitado | descontinuado
  ADD COLUMN documento_origem_id UUID REFERENCES documentos(id),
  ADD COLUMN criado_por_agente_id UUID REFERENCES agentes_ia(id),
  ADD COLUMN motivo_rejeicao TEXT;

-- Registro de qual agente foi capacitado em qual Skill, e por quem
CREATE TABLE agente_skills (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id               UUID NOT NULL REFERENCES agentes_ia(id) ON DELETE CASCADE,
  workflow_definition_id  UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  concedido_em            TIMESTAMPTZ NOT NULL DEFAULT now(),
  concedido_por_colaborador_id UUID REFERENCES colaboradores(id),
  revogado_em             TIMESTAMPTZ,
  UNIQUE (agente_id, workflow_definition_id)
);

-- As Skills ja existentes (ex.: "Emitir Seguro Auto", seed de teste)
-- ja estavam em producao antes deste conceito de rascunho existir --
-- marcamos como ativas retroativamente, sem exigir novo fluxo de aprovacao.
UPDATE workflow_definitions SET status_publicacao = 'ativo' WHERE ativo = true;
