# Proposal: Correção Definitiva de Duplicação de Contas e Resolução de R$ NaN no Fechamento por Filial (294)

## Problema
1. **Duplicação de Contas a Pagar ao Importar Planilha de Despesas:**
   - Na importação da planilha (`useContasAPagarImport.ts`), o sistema grava os itens linha a linha em `daily_manual_bills` e também atualiza o campo acumulado `daily_snapshots.contas_a_pagar`.
   - Na RPC `get_daily_reconciliation_summary`, a fórmula executava:
     `v_contas_manual := v_contas_base + v_contas_extras;`
     onde `v_contas_base` pegava o snapshot e `v_contas_extras` pegava a soma dos itens da tabela.
   - Isso somava o valor **duas vezes** (2x o total das despesas), inflando artificialmente as contas a pagar e quebrando o cálculo de `valor_disp_contas` e `diferenca_final`.
2. **Exibição de "R$ NaN" nos Cards de Fechamento por Filial:**
   - Em `src/routes/conciliacao.index.tsx`, o card de cada uma das 10 lojas buscava `log.maquininha` e `log.pix`.
   - Na RPC, a chave era retornada como `rede_liquido` e o total de PIX por filial não estava presente no objeto retornado no array `stores`.
   - Como resultado, os valores eram `undefined` e o componente `<AnimatedNumber>` renderizava `R$ NaN`.

## Solução Proposta de Ponta a Ponta
1. **Deduplicação Canônica em `get_daily_reconciliation_summary`:**
   - A soma real dos lançamentos em `daily_manual_bills` é a **fonte oficial da verdade**.
   - Se houver lançamentos em `daily_manual_bills` (`v_total_bills > 0`), `v_contas_manual := v_total_bills`.
   - Se não houver itens detalhados (ex: dia histórico sem planilha importada), utiliza `v_snapshot.contas_a_pagar` como fallback.
   - **Zero duplicação**: o snapshot nunca mais é somado junto com os itens detalhados.
2. **Preenchimento Completo de Métricas por Loja (Maquininha, PIX, Previsto, Diferença):**
   - Na RPC, o objeto de cada loja em `stores` passa a incluir:
     - `maquininha` & `rede_liquido`: Vendas líquidas de cartão do dia no POS
     - `pix` & `pix_os`: Entradas PIX vinculadas à loja
     - `previsto_ofx`: Soma de vendas do dia (`maquininha + pix`)
     - `diferenca`: Diferença apurada entre entradas OFX e previsto
   - No componente `src/routes/conciliacao.index.tsx`, adicionar fallbacks seguros (`log.maquininha ?? log.rede_liquido ?? 0` e `log.pix ?? log.pix_os ?? 0`), blindando a UI contra qualquer `NaN`.

## Contratos de Dados & Backend
- **Tabelas:** `daily_manual_bills`, `daily_snapshots`, `pos_transactions`, `ofx_transactions`, `patio_os`, `stores`.
- **RPC:** `get_daily_reconciliation_summary`.

## Risco Principal
- **Risco:** Lojas sem movimentação no dia terem valores nulos.
- **Mitigação:** Tratamento rigoroso com `COALESCE(..., 0)` no SQL e `?? 0` no React.
