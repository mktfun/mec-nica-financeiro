# Proposal: Refatoração da Tela de Detalhes da Loja com Gráficos Analíticos e Macro Segmentação por Fornecedor (214)

## Problema
1. **Filtro de Data Inicial Vazio e Desconectado do Banco:** A rota `/loja/$lojaId` inicializava as datas de filtro (`startDate` e `endDate`) com a data do sistema operacional (`new Date()`), fazendo a tela abrir com valores zerados (R$ 0,00) e mensagem "Nenhuma transação encontrada neste período", pois as importações ocorrem em lotes consolidados (ex: `14/08/2026`).
2. **Gráfico Estático e Ausência de Drill-Down por Fornecedor:** O gráfico atual não possui alternância dinâmica entre a visão macro (Receitas x Despesas) e a segmentação analítica por Fornecedor/Favorecido (Saídas) e Origem (Entradas), deixando o operador sem visibilidade de para onde os recursos de cada filial estão sendo destinados.
3. **Agregação Ineficiente no Cliente:** O cálculo das métricas de loja e agrupamentos ocorria por iterações `.reduce()` no cliente sobre arrays não-paginados, sem agregação estruturada no PostgreSQL, além de sofrer com `TypeError` caso campos de contraparte ou datas viessem como `null` ou `undefined`.

## Solução Proposta
1. **Nova RPC PostgreSQL com CTEs Isoladas (`get_store_analytic_breakdown`):**
   - Agregação atômica e segura com `COALESCE` e `SECURITY DEFINER`.
   - **CTE 1 (`cte_summary`):** Total de Entradas, Total de Saídas, Resultado do Período e Saldo Bancário Atual (do fechamento mais recente).
   - **CTE 2 (`cte_suppliers_out`):** Agrupamento das despesas (`type = 'out'`) por fornecedor higienizado (extraído de `counterpart_name` ou sanitizado de `title`), com total monetário, percentual relativo e consolidação automática de pequenos gastos (< 3%) em *"Outros Fornecedores"*.
   - **CTE 3 (`cte_sources_in`):** Agrupamento das receitas (`type = 'in'`) por canais de entrada (*Cartão REDE*, *PIX Recebido*, *Transferências*, *Rendimentos*).
   - **CTE 4 (`cte_transactions`):** Retorno otimizado dos lançamentos com nomes normalizados de fornecedor e status.
2. **Auto-Detecção de Datas com Extrato e Atalhos Rápidos:**
   - A tela auto-seleciona a data mais recente com dados da loja via `useAvailableConciliacaoDates`.
   - Botões de seleção de período: `[Último Fechamento]`, `[Últimos 7 dias]`, `[Mês Atual]`, `[Todo o Período]`.
3. **Gráfico em Donut/Pizza Interativo com State-Switching Dinâmico:**
   - **Modo 1 (Consolidado - Receitas x Despesas):** Fatias Verde vs Vermelho com o resultado líquido central.
   - **Modo 2 (Analítico - Despesas por Fornecedor):** Fatias em cores macro distintas por fornecedor/favorecido com valor em R$ e percentual relativo.
   - **Modo 3 (Analítico - Receitas por Origem):** Fatias por canal de entrada.
   - Sincronização fluida com as abas de listagem (`Extrato`, `Saídas`, `Entradas`).
4. **Listagem com Busca Inline e Paginação Sólida:**
   - Campo de pesquisa em tempo real por fornecedor, documento ou valor.

## Contratos de Dados
- **Tabelas / Views Consultadas:**
  - `transactions` (view com `ofx_transactions` + `manual_transactions`)
  - `reconciliations` (saldos bancários e fechamentos)
  - `daily_snapshots` (odômetros e histórico)
- **RPC Criada:**
  ```sql
  CREATE OR REPLACE FUNCTION get_store_analytic_breakdown(
      p_store_id text,
      p_start_date date,
      p_end_date date
  ) RETURNS jsonb ...
  ```

## API / Interface
- **Hooks:**
  - `useStoreAnalyticBreakdown(storeId, startDate, endDate)` em `src/hooks/useStores.ts`.
- **Componentes React:**
  - `src/routes/loja.$lojaId.tsx` (orquestrador da página de detalhes).
  - `src/components/lojas/LojaPieCharts.tsx` (gráfico interativo com Recharts, cores macro e tooltips com escapeViewBox).
  - `src/lib/parsers/supplierUtils.ts` (normalizador de fornecedores e categorias).

## Features Existentes Impactadas
- Rota `/loja/$lojaId` (mantidas integralmente as funcionalidades de caixa físico, ajuste de saldo e navegação de retorno para `/lojas`).

## Risco Principal
- **Risco:** Transações de extrato sem descrição ou com nomes genéricos gerarem fatias indeterminadas no gráfico.
- **Probabilidade:** Média.
- **Impacto:** Baixo (Reversível).
- **Mitigação:** Tratamento defensivo via `COALESCE(NULLIF(counterpart_name, ''), NULLIF(title, ''), 'Outros / Não Identificado')` tanto no backend (PostgreSQL) quanto no utilitário de frontend.
