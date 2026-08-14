# Proposal: Backend Daily Reconciliation Summary & Math Delegation (196)

## Problema
1. **Lentidão Crítica na UI:** A tela de Conciliação Diária (`/conciliacao/`) e o componente `ResumoDiaPanel` executam múltiplas requisições paralelas trazendo milhares de registros brutos (`transactions`, `pos_transactions`, etc.) e executando múltiplos `.reduce()` no client-side a cada renderização. Isso trava a thread principal do navegador e bate em limites de paginação do Supabase.
2. **Faturamento Zerado e Diferença Incorreta:** O cálculo do Faturamento do dia no frontend busca acumulações parciais ou tenta subtrair `faturamento_anterior` (R$ 257.011,03) de entradas diárias isoladas, resultando em Faturamento Líquido zerado (`R$ 0,00`) e gerando um `Valor Disp. Contas` distorcido (`-R$ 130.634,77`).
3. **Consolidação Incompleta de Saldos:** Devido ao carregamento assíncrono descoordenado no client-side, o somatório dos saldos bancários das lojas é renderizado parcialmente antes da conclusão de todas as promessas.

## Solução Proposta
Delegar 100% da agregação e consolidação matemática para o PostgreSQL (Supabase) através de uma nova RPC ultra-otimizada: `get_daily_reconciliation_summary(p_date date)`.
- A RPC processa diretamente no banco de dados indexado:
  - Soma dos saldos bancários reais das lojas (`reconciliations.bank_total`).
  - Entradas puras do OFX do dia (`ofx_transactions.amount WHERE type = 'in'`).
  - Saídas do OFX do dia (`ofx_transactions.amount WHERE type = 'out'`).
  - Juros/Taxas reais da maquininha REDE (`pos_transactions.fee_amount`).
  - Caixa e Faturamento do dia anterior (`daily_snapshots WHERE date < p_date ORDER BY date DESC LIMIT 1`).
  - Entradas manuais e metadados (`daily_snapshots.dinheiro_mp`, `a_receber_manual`, `contas_a_pagar`).
  - Cálculo atômico e imutável de `caixa_atual`, `fluxo_caixa`, `faturamento_liquido`, `valor_disp_contas`, `valor_contas` e `diferenca_final`.
- O frontend (`useBackendConciliacao` / `useConciliacaoSummary`) passa a fazer uma única chamada RPC que responde em < 50ms com os dados consolidados prontos para renderização instantânea.

## Contratos de Dados
- **Tabelas Supabase Envolvidas (Existentes):**
  - `reconciliations` (leitura de `bank_total`, `store_id`, `date`)
  - `ofx_transactions` (leitura de `amount`, `type`, `target_date`)
  - `pos_transactions` (leitura de `fee_amount`, `target_date`)
  - `daily_snapshots` (leitura e gravação de `caixa_atual`, `faturamento`, `dinheiro_mp`, `a_receber_manual`, `contas_a_pagar`, `juros_rede`, `metadata`)
  - `patio_os` (leitura de OS pendentes ativas)
  - `stores` (leitura de `id`, `name`)
- **Mutações de Estado:**
  - Sem alteração estrutural destrutiva de tabelas.
  - Apenas criação da RPC `get_daily_reconciliation_summary` e leitura/atualização otimizada.
- **RLS Policies:**
  - RPC com `SECURITY DEFINER` para permitir leitura performática aos usuários autenticados.

## API / Interface
- **Nova RPC no PostgreSQL:**
  - `public.get_daily_reconciliation_summary(p_date date) RETURNS jsonb`
- **Hooks Afetados:**
  - `src/hooks/useBackendConciliacao.ts`: Criação do hook `useDailyReconciliationSummary(date)`.
  - `src/routes/conciliacao.index.tsx`: Simplificação drástica, removendo queries residuais e loops pesados.
  - `src/components/conciliacao/ResumoDiaPanel.tsx`: Consome diretamente as métricas consolidadas pelo backend.

## Features Existentes Impactadas
- `specs/global/features.md`:
  - `Conciliação Diária (/conciliacao/)`: Renderização otimizada, carregamento instantâneo.
  - `ResumoDiaPanel`: Cálculo consolidado no backend com garantia de integridade decimal.
  - `BreakdownModal` e visualização por loja: Mantidos intactos sem regressão.

## Risco Principal
- **Risco:** Divergência de arredondamento em float ou data anterior não encontrada para o primeiro dia de operação.
  - **Probabilidade:** Baixa
  - **Impacto:** Reversível
  - **Mitigação:** Uso estrito do tipo `NUMERIC` com `ROUND(..., 2)` e `COALESCE(..., 0)` no PostgreSQL, com fallback garantido para os metadados do snapshot ou Marco Zero quando não houver dia anterior.
