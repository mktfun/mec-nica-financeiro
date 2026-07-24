-- BMF IA OS — Migração V7
-- Fonte: EA-DOC-002 e EA-DOC-003
-- Workflow Engine, Connector Manager (versionamento), Business Memory, Scheduler

-- ============================================================
-- TIPOS ENUMERADOS NOVOS
-- ============================================================
CREATE TYPE status_workflow AS ENUM ('rascunho', 'em_execucao', 'aguardando', 'concluido', 'com_erro', 'cancelado');
CREATE TYPE status_step AS ENUM ('pendente', 'em_execucao', 'concluido', 'com_erro', 'pulado');
CREATE TYPE status_connector AS ENUM ('ativo', 'em_teste', 'descontinuado', 'com_falha');
CREATE TYPE nivel_confianca AS ENUM ('declarada', 'inferida_alta', 'inferida_baixa');

-- ============================================================
-- DOMÍNIO: WORKFLOW ENGINE (EA-DOC-002, Secao 4)
-- ============================================================

-- Uma "Skill" (EA-DOC-002 §6) é uma workflow_definition nomeada e versionada.
CREATE TABLE workflow_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            VARCHAR(150) NOT NULL,          -- ex.: "Emitir Seguro Auto"
  versao          VARCHAR(20) NOT NULL DEFAULT '1.0',
  descricao       TEXT,
  definicao_json  JSONB NOT NULL,                 -- lista de steps: {nome, tipo, evento_gatilho, evento_conclusao, skill/tool/connector}
  ativo           BOOLEAN NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nome, versao)
);

CREATE TABLE workflow_instances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id),
  cliente_id            UUID REFERENCES clientes(id),
  empresa_id            UUID,                      -- preparado para Multi-Tenant (EA-DOC-002 §11 / DM-DOC-002 §2)
  status                status_workflow NOT NULL DEFAULT 'em_execucao',
  contexto              JSONB NOT NULL DEFAULT '{}'::jsonb,  -- dados acumulados entre steps
  step_atual            INTEGER NOT NULL DEFAULT 0,
  iniciado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em          TIMESTAMPTZ
);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_cliente ON workflow_instances(cliente_id);

CREATE TABLE workflow_steps (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id  UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  ordem                 INTEGER NOT NULL,
  nome_step             VARCHAR(150) NOT NULL,
  evento_gatilho        VARCHAR(100),
  evento_conclusao      VARCHAR(100),
  status                status_step NOT NULL DEFAULT 'pendente',
  resultado             JSONB,
  iniciado_em           TIMESTAMPTZ,
  concluido_em          TIMESTAMPTZ
);
CREATE INDEX idx_workflow_steps_instance ON workflow_steps(workflow_instance_id, ordem);

-- Etapas que aguardam um evento externo (ex.: ClientApproved) — pode levar dias.
CREATE TABLE workflow_waits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id  UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  aguardando_evento     VARCHAR(100) NOT NULL,      -- ex.: "ClientApproved"
  expira_em             TIMESTAMPTZ,
  acao_expiracao        VARCHAR(50) DEFAULT 'cancelar',  -- cancelar | escalar_humano | reenviar
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvido_em          TIMESTAMPTZ
);
CREATE INDEX idx_workflow_waits_pendentes ON workflow_waits(aguardando_evento) WHERE resolvido_em IS NULL;

-- ============================================================
-- DOMÍNIO: CONNECTOR MANAGER (EA-DOC-002, Secao 7)
-- ============================================================

CREATE TABLE connectors (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                    VARCHAR(100) UNIQUE NOT NULL,   -- ex.: "porto_seguro"
  versao                  VARCHAR(20) NOT NULL DEFAULT '1.0',
  tipo                    VARCHAR(30) NOT NULL DEFAULT 'connector', -- connector | tool | skill (EA-DOC-002 §6)
  compatibilidade_minima  VARCHAR(20),
  status                  status_connector NOT NULL DEFAULT 'ativo',
  dominios_permitidos     JSONB NOT NULL DEFAULT '[]'::jsonb,
  terceiro                BOOLEAN NOT NULL DEFAULT false,  -- Marketplace (EA-DOC-003 §3) — reservado, não usado ainda
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE connector_updates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id      UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  versao_anterior   VARCHAR(20),
  versao_nova       VARCHAR(20) NOT NULL,
  status_autoteste  VARCHAR(30) DEFAULT 'pendente',   -- pendente | aprovado | falhou_rollback
  aplicado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  revertido_em      TIMESTAMPTZ
);

-- ============================================================
-- DOMÍNIO: BUSINESS MEMORY (EA-DOC-003, Secao 6)
-- ============================================================

CREATE TABLE memoria_negocio (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id        UUID,                             -- preparado para Multi-Tenant
  categoria         VARCHAR(60) NOT NULL,              -- preferencia | restricao | objecao | contexto_familiar
  conteudo          JSONB NOT NULL,
  agente_origem_id  UUID REFERENCES agentes_ia(id),
  confianca         nivel_confianca NOT NULL DEFAULT 'inferida_baixa',
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memoria_negocio_cliente ON memoria_negocio(cliente_id, categoria);

-- ============================================================
-- DOMÍNIO: SCHEDULER (EA-DOC-003, Secao 5)
-- ============================================================

CREATE TABLE agendamentos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              VARCHAR(150) NOT NULL,
  tipo              VARCHAR(20) NOT NULL DEFAULT 'cron',  -- cron | timer_unico
  expressao_cron    VARCHAR(50),                          -- ex.: "0 8 * * *" (todo dia às 8h)
  proxima_execucao  TIMESTAMPTZ NOT NULL,
  evento_a_publicar VARCHAR(100) NOT NULL,
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  ultima_execucao   TIMESTAMPTZ
);
CREATE INDEX idx_agendamentos_proxima ON agendamentos(proxima_execucao) WHERE ativo = true;
