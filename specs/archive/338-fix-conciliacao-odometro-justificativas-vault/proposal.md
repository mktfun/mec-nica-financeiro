# Proposal: Correção Integral da Conciliação Diária, Odômetro Anterior, Justificativas e Cofre (338)

## Problema
Após limpar os dados do dia e refazer o fechamento do zero, o operador enfrentou 4 falhas críticas que inviabilizavam a conciliação:
1. **Erro SQL 42703 no Console / Step 3 (`store_cash_vault.store_name does not exist`):** Ao carregar a tela de conferência de cofre do Daniel (`Step3CashVaultDaniel.tsx`), a query tentava selecionar a coluna inexistente `store_name` na tabela `store_cash_vault`, gerando exceção do PostgreSQL e travando a listagem de valores em trânsito.
2. **Faturamento Astronômico de R$ 1.030.303,99 (Diferença de R$ 987.879,83):** Na RPC `get_daily_reconciliation_summary`, a extração do odômetro anterior do snapshot anterior foi simplificada incorretamente para `faturamento` (que guarda o delta diário ou 0), em vez de ler `metadata->>'odometro_hoje'`. Com isso, o Faturamento do Dia exibiu o odômetro acumulado bruto (R$ 1.030.303,99) em vez do delta real (R$ 19.434,70), estourando o Valor Disponível para Contas e a Diferença Final. Além disso, o snapshot intermediário era congelado prematuramente como `is_closed: true`.
3. **Justificativas do Step 2 Não Somavam no Faturamento nem no Contas:** Ao justificar entradas com *"Somar ao Faturamento"* e saídas com *"Adicionar ao Contas a Pagar"* em `Step2NonRevenueJustifications.tsx`:
   - As queries falhavam por tentar buscar colunas inexistentes (`title` e `match_status` em `ofx_transactions`).
   - O `handleSaveInflow` apenas atualizava texto em `ofx_transactions` e **não realizava upsert em `daily_revenue_adjustments`**, fazendo com que a RPC nunca contabilizasse o faturamento extra.
4. **Step 1 (`Step1UnregisteredPayments.tsx`) Falsamente Vazio ("100% Conciliado"):** Em `CentralImportWizard.tsx` (`fetchRealUnmatchedTransactions`), a query para buscar PIX órfãos e transações REDE pendentes continha colunas inexistentes (`title` em OFX e `method`, `card_brand`, `nsu` em POS), falhando silenciosamente e passando um array vazio para a tela de vínculos manuais.

## Solução Proposta (Foco em Reuso e Correção Cirúrgica)
1. **Correção de Backend e RPC (`get_daily_reconciliation_summary`):**
   - Criar a migration `20260901000013_fix_canonical_odometro_and_step2_justifications.sql`.
   - Recuperar com precisão o odômetro acumulado do snapshot anterior (`COALESCE((metadata->>'odometro_hoje')::numeric, ...)`).
   - Calcular o delta diário canônico: `faturamento_oi_base = odometro_hoje - faturamento_anterior` (R$ 19.434,70).
   - Integrar tanto `daily_revenue_adjustments` quanto transações OFX com `match_status = 'REVENUE_ADJUSTED'` no Faturamento do Período em ambos os ramais da RPC (aberto e fechado).
   - Calcular dinamicamente `daily_manual_bills` com despesas extras adicionadas via `resolve_orphan_saida_ofx`.
2. **Correção no `Step3CashVaultDaniel.tsx`:**
   - Corrigir a query de `store_cash_vault` usando as colunas reais (`id, store_id, amount, entry_date, status, stores(name)`) e mapear `store_name` via relação ou fallback.
3. **Correção no `Step2NonRevenueJustifications.tsx`:**
   - Corrigir as queries de débitos e créditos removendo referências a colunas inexistentes.
   - Fazer `handleSaveInflow` persistir no `daily_revenue_adjustments` quando marcado como receita.
   - Garantir invalidação total dos caches do TanStack Query (`daily-reconciliation-summary`, `backend-conciliacao`, etc.).
4. **Correção no `CentralImportWizard.tsx`:**
   - Corrigir as queries de `fetchRealUnmatchedTransactions` com as colunas reais de `ofx_transactions` (`bank_name, counterpart_name`) e `pos_transactions` (`payment_method, machine_name`).
   - Adicionar fallback em memória chamando `executeAutoMatchingEngine` caso o DB ainda esteja sendo indexado.
   - Salvar o snapshot intermediário do Step 3 como `is_closed: false` (draft) para não congelar prematuramente os valores antes da auditoria final.

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Reutilizadas:**
  - `get_daily_reconciliation_summary` (RPC): Reutilizada e substituída via `CREATE OR REPLACE FUNCTION`.
  - `resolve_orphan_saida_ofx` (RPC): Já implementada e homologada, agora chamada com parâmetros corretos.
  - `daily_revenue_adjustments`, `daily_manual_bills`, `store_cash_vault`, `ofx_transactions`, `pos_transactions`: Todas as tabelas existentes são preservadas sem nenhuma criação de estrutura paralela.
- **Componentes / Hooks Reutilizados:**
  - `Step1UnregisteredPayments.tsx`, `Step2NonRevenueJustifications.tsx`, `Step3CashVaultDaniel.tsx`, `CentralImportWizard.tsx`, `ResumoDiaPanel.tsx`.

## Contratos de Dados & SQL (Supabase)
- **Migration `20260901000013_fix_canonical_odometro_and_step2_justifications.sql`**:
  - `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean)` atualizada com cálculo de delta faturamento, agregação de justificativas e split por filial.

## API & Componentes (Frontend)

### `[MODIFY] Step3CashVaultDaniel.tsx`
- Corrigir `.select()` de `store_cash_vault` para incluir `stores(name)`.

### `[MODIFY] Step2NonRevenueJustifications.tsx`
- Corrigir `.select()` de `pending-ofx-outflows` e `pending-ofx-inflows`.
- Adicionar upsert em `daily_revenue_adjustments` no `handleSaveInflow`.
- Atualizar invalidação de queries.

### `[MODIFY] CentralImportWizard.tsx`
- Corrigir `.select()` de `fetchRealUnmatchedTransactions`.
- Salvar snapshot em modo draft (`is_closed: false`) nas etapas intermediárias do wizard.

## Risco Principal e Mitigação
- **Risco:** Regressão no cálculo de faturamento para datas históricas que não possuem `metadata->>'odometro_hoje'`.
- **Mitigação:** Fallback em cascata: `COALESCE((metadata->>'odometro_hoje')::numeric, (metadata->>'faturamento_oi_base')::numeric, (metadata->>'odometro_anterior')::numeric, faturamento, 0)`.
