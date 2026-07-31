-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector (Knowledge Base Service)

-- Tipos enumerados
CREATE TYPE tipo_pessoa        AS ENUM ('PF', 'PJ');
CREATE TYPE status_cliente     AS ENUM ('ativo', 'inativo', 'prospectado');
CREATE TYPE estagio_funil      AS ENUM ('novo', 'qualificado', 'cotacao', 'negociacao', 'convertido', 'perdido');
CREATE TYPE status_proposta    AS ENUM ('rascunho', 'enviada', 'em_negociacao', 'aceita', 'recusada', 'expirada');
CREATE TYPE status_apolice     AS ENUM ('em_emissao', 'ativa', 'cancelada', 'vencida', 'em_renovacao');
CREATE TYPE status_sinistro    AS ENUM ('aberto', 'em_analise', 'aprovado', 'pago', 'negado');
CREATE TYPE classe_agente      AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE status_homolog     AS ENUM ('especificado', 'em_homologacao', 'homologado', 'reprovado', 'descontinuado');
CREATE TYPE tipo_memoria       AS ENUM ('permanente', 'aprendizado');
CREATE TYPE nivel_permissao    AS ENUM ('leitura', 'leitura_escrita', 'negado');
