-- BMF IA OS — Migração V4
-- Fonte: DM-DOC-001, Seção 3.4

-- ============================================================
-- DOMÍNIO: COMERCIAL E OPERACIONAL
-- ============================================================

CREATE TABLE seguradoras (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                VARCHAR(255) NOT NULL,
  cnpj                VARCHAR(20) UNIQUE NOT NULL,
  api_endpoint         VARCHAR(255),
  status_integracao    VARCHAR(50) DEFAULT 'nao_integrado'
);

CREATE TABLE produtos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seguradora_id  UUID NOT NULL REFERENCES seguradoras(id),
  nome           VARCHAR(255) NOT NULL,
  tipo_seguro    VARCHAR(100) NOT NULL,      -- ex.: auto, vida, residencial
  ativo          BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE clientes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa        tipo_pessoa NOT NULL,
  nome_razao_social  VARCHAR(255) NOT NULL,
  cpf_cnpj           VARCHAR(20) UNIQUE NOT NULL,
  email              VARCHAR(255),
  telefone           VARCHAR(20),
  endereco           JSONB,
  status             status_cliente NOT NULL DEFAULT 'ativo',
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);

CREATE TABLE prospectos (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                   VARCHAR(255) NOT NULL,
  email                  VARCHAR(255),
  telefone               VARCHAR(20),
  origem_lead            VARCHAR(100),
  estagio_funil          estagio_funil NOT NULL DEFAULT 'novo',
  score_qualificacao     INTEGER DEFAULT 0,
  cliente_convertido_id  UUID REFERENCES clientes(id),
  agente_responsavel_id  UUID REFERENCES agentes_ia(id),
  criado_em              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prospectos_estagio ON prospectos(estagio_funil);

CREATE TABLE contatos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nome        VARCHAR(255) NOT NULL,
  cargo       VARCHAR(150),
  email       VARCHAR(255),
  telefone    VARCHAR(20),
  principal   BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE propostas (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id             UUID NOT NULL REFERENCES clientes(id),
  produto_id             UUID NOT NULL REFERENCES produtos(id),
  agente_responsavel_id  UUID REFERENCES agentes_ia(id),
  valor_estimado         NUMERIC(14,2),
  status                 status_proposta NOT NULL DEFAULT 'rascunho',
  criado_em              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_propostas_cliente ON propostas(cliente_id);

CREATE TABLE apolices (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id             UUID NOT NULL REFERENCES clientes(id),
  produto_id             UUID NOT NULL REFERENCES produtos(id),
  seguradora_id          UUID NOT NULL REFERENCES seguradoras(id),
  agente_responsavel_id  UUID REFERENCES agentes_ia(id),
  numero_apolice         VARCHAR(100) UNIQUE NOT NULL,
  data_inicio            DATE NOT NULL,
  data_fim               DATE NOT NULL,
  premio                 NUMERIC(14,2) NOT NULL,
  status                 status_apolice NOT NULL DEFAULT 'em_emissao'
);
CREATE INDEX idx_apolices_cliente ON apolices(cliente_id);
CREATE INDEX idx_apolices_status ON apolices(status);

CREATE TABLE sinistros (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apolice_id       UUID NOT NULL REFERENCES apolices(id),
  data_ocorrencia  DATE NOT NULL,
  tipo             VARCHAR(100),
  status           status_sinistro NOT NULL DEFAULT 'aberto',
  valor_estimado   NUMERIC(14,2),
  valor_pago       NUMERIC(14,2)
);

CREATE TABLE atividades (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id       UUID REFERENCES clientes(id),
  prospecto_id     UUID REFERENCES prospectos(id),
  agente_id        UUID REFERENCES agentes_ia(id),
  colaborador_id   UUID REFERENCES colaboradores(id),
  tipo             VARCHAR(100) NOT NULL,
  descricao        TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cliente_id IS NOT NULL OR prospecto_id IS NOT NULL)
);
CREATE INDEX idx_atividades_cliente ON atividades(cliente_id);
CREATE INDEX idx_atividades_prospecto ON atividades(prospecto_id);
