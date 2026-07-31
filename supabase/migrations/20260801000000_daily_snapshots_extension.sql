-- Migration: add fields for conciliacao diaria refactor

ALTER TABLE daily_snapshots
ADD COLUMN IF NOT EXISTS a_receber_manual numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS faturamento_outros_valor numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS faturamento_outros_desc text,
ADD COLUMN IF NOT EXISTS contas_a_pagar numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS provisao numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_negativo_itau numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS juros_rede numeric NOT NULL DEFAULT 0;
