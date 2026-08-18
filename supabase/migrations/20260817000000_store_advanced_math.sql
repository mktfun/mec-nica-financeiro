-- Migration: 20260817000000_store_advanced_math.sql
-- Propósito: Adicionar colunas de granularidade de custos e pedidos na tabela de lojas
-- para viabilizar o cálculo avançado (Spec 200 simplificada).

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS pedidos_mesa integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pedidos_ifood integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pedidos_99 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pedidos_keeta integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_fixo_salao numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_fixo_delivery numeric(12,2) DEFAULT 0;
