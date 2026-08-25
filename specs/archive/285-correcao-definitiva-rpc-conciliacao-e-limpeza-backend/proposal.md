# Proposal: Correção Definitiva da RPC de Conciliação, Higienização do Backend e Blindagem de Performance (285)

## Problema

1. **Quebra Fatal (Erro 400) em Dias Fechados:** A migração recente (`20260825000003_receivables_schema_and_rpc.sql`) inseriu uma query na RPC `get_daily_reconciliation_summary` buscando colunas inexistentes na tabela `reconciliations` (`r.pix_total` e `r.rede_total`). Sempre que o usuário abre qualquer dia fechado/congelado (ex: 24/08/2026), o PostgreSQL aborta com erro `42703 (column r.pix_total does not exist)`, quebrando o frontend e exibindo o dashboard zerado com falsa divergência de R$ 39.492,31.
2. **Distorção no Cálculo do Saldo Bancário em Dias Abertos (25/08):** O cálculo do `saldo_bancos` no Ramal 2 da RPC foi alterado para somar as transações do dia (`SUM(in - out)` do OFX = -R$ 47.747,63), em vez de consolidar o **saldo patrimonial real das contas bancárias das 10 filiais** (+R$ 39.190,77). Isso gerou um efeito cascata: o saldo bancário virou -R$ 22.265,36, o Caixa Atual caiu de ~R$ 167k para R$ 79.984,92, o Fluxo de Caixa despencou para -R$ 95.701,07 e a Diferença Final explodiu para R$ 61.456,25 (quando hoje cedo a diferença real era centavos).
3. **Lentidão Crítica (Gargalo de Performance):** A tela de conciliação começou a demorar múltiplos segundos por causa de chamadas encadeadas não indexadas, cruzamentos desnecessários em subqueries LATERAL com parsing repetido de JSON, e disparo simultâneo de múltiplos hooks no frontend (`useBackendConciliacao`, `useDailyReconciliationSummary`, `usePosTripleReconciliation`, `useGlobalOfxOut`).
4. **Acúmulo de Código Obsoleto / Teia Frankenstein:** RPCs sobrecarregadas com assinaturas duplicadas (`p_date text` vs `p_date date`), consultas redundantes no frontend calculando valores que devem vir 100% prontos do banco, e perda do estado de `is_closed: true` nos snapshots históricos (17, 18, 19, 21/08).

## Solução Proposta

1. **Correção e Unificação da RPC Canônica `get_daily_reconciliation_summary`:**
   - Eliminar referências a colunas inexistentes (`r.pix_total`, `r.rede_total`) no Ramal 1 (dias fechados), retornando o payload fiel dos metadados gravados e a lista de filiais correta.
   - Restaurar o cálculo do Saldo Bancário das 10 filiais no Ramal 2 (dias abertos) usando a consolidação patrimonial via `reconciliations.bank_total` (ou snapshot) somado ao dinheiro em cofre em trânsito e cartões a compensar.
   - Otimizar a consulta das 10 filiais através de CTEs indexadas pré-agregadas, reduzindo o tempo de resposta da RPC para < 30ms.
2. **Blindagem dos Snapshots Homologados:**
   - Garantir que os snapshots oficiais (17/08, 18/08, 19/08, 21/08 e 24/08) estejam devidamente travados com `is_closed = true` e seus metadados de auditoria imutáveis.
3. **Padronização 100% Backend (Zero Cálculo no Front):**
   - Garantir que a tela de conciliação e a tela de recebíveis consumam apenas os valores computados pelas RPCs dedicadas, sem somas ou reduções manuais no client-side.
4. **Limpeza de Sobrecargas e Índices Estratégicos:**
   - Dropar sobrecargas obsoletas de RPCs conflitantes no Supabase.
   - Criar índices compostos nas tabelas de transação (`ofx_transactions`, `pos_transactions`, `store_cash_vault`, `patio_os`) para zerar a latência da tela.

## Contratos de Dados

- **Tabela `daily_snapshots`:**
  - Manter colunas `is_closed BOOLEAN`, `closed_at TIMESTAMPTZ`, `metadata JSONB`.
- **Tabela `reconciliations`:**
  - Campos canônicos: `store_id`, `date`, `bank_total`, `na_loja_os`, `machine_total`, `status`.
- **Tabela `receivables`:**
  - Schema com índices em `(store_id, due_date, status)` e `(date, status)`.

## API / Interface

- **RPC Principal:** `public.get_daily_reconciliation_summary(p_date date, p_force_dynamic boolean DEFAULT false) RETURNS jsonb`
- **RPC Recebíveis:** `public.get_receivables_summary(p_date date) RETURNS jsonb`

## Features Existentes Impactadas

- `ResumoDiaPanel.tsx`
- `conciliacao.index.tsx`
- `useBackendConciliacao.ts`
- `ReceivablesTable.tsx`

## Risco Principal

- Regressão nos cálculos históricos de dias passados.
- **Mitigação:** Validação cruzada automatizada de todos os dias fechados (17, 18, 19, 21, 24/08) e do dia aberto (25/08) via script Node contra os gabaritos oficiais.
