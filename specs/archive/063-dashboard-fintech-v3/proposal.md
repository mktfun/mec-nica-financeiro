# Proposal: Dashboard Fintech V3 — Ancoragem na Última Conciliação (063)

## Problema
O Dashboard V2 trouxe uma grade executiva excelente, mas ancorou os dados temporais no **Mês Selecionado**, quando na realidade a operação de uma rede de oficinas precisa de uma visão focada na **Última Conciliação** (o último dia fechado/conferido). 
O usuário pediu para:
1. Mudar todos os indicadores para refletirem os valores da "Última Conciliação" em vez de acumulados mensais.
2. Faturamento: Comparar a "Última Conciliação" (Atual) com a "Conciliação Anterior" (Anterior).
3. Tabela de Lojas: Adicionar uma linha de **Total** (somatório) na base.
4. Visual: Incluir um gráfico mais "fácil de ler e entender" para a saúde geral.

## Solução Proposta
Reescrever o hook `useDashboardV2` (que passaremos a chamar ou atualizar internamente) para não depender de `selectedMonth`. 
1. **Determinar Datas:** Buscar a data máxima (`dateAtual`) presente na tabela `reconciliations` e a data imediatamente anterior (`dateAnterior`).
2. **Saldo Total, Caixa Atual, Diferença:** Serão todos baseados exclusivamente nos registros dessa `dateAtual`.
3. **Faturamento:** O "Atual" será a soma de `os_total` em `dateAtual`. O "Anterior" será a soma de `os_total` em `dateAnterior`. Labels na UI alterados de "Mês Atual" para "Atual" e a trend para "vs ANTERIOR".
4. **Tabela e Pátio:** Injeção de uma `tfoot` com o somatório de todas as colunas numéricas (Saldo, Faturamento, Contas, Resultado). Além disso, a tabela ganhará colunas detalhando os **Veículos em Pátio (Qtd e Valor)** por loja, em vez de mostrar apenas um banner global.
5. **Gráfico Visual:** Adição de um **Gráfico de Área (Evolução do Saldo Global)** mostrando a curva dos últimos 7 a 15 dias de conciliação. É extremamente executivo ver se a curva do dinheiro está subindo ou descendo.

## Contratos de Dados
- `reconciliations`: Busca as datas únicas distintas (`date`) ordenadas de forma decrescente para encontrar `dateAtual` (índice 0) e `dateAnterior` (índice 1).
- `oficina_contas`: Mantém a query atual (total de contas a pagar ativas, D-1 puxado pelo bot).
- `patio_os`: Mantém a query atual de OSs abertas (para A Receber e Veículos em Pátio).

## API / Interface
- `useDashboardV2.ts` será refatorado para ignorar o input de `selectedMonth` (ou removê-lo da interface).
- `StoreTableDashboard.tsx` receberá lógica de somatório e a linha final de Total.
- Criação de `EvolucaoSaldoChart.tsx` (Recharts AreaChart) para compor a visão com o gráfico de barras.

## Features Existentes Impactadas
- `src/routes/index.tsx` (Dashboard base)
- Hooks de dashboard e charts de faturamento

## Risco Principal
- O bot de conciliação pode rodar em momentos diferentes para lojas diferentes. A "Última Conciliação" global (`MAX(date)`) pode não ter registros para TODAS as lojas se alguma loja atrasou o envio de dados. Precisamos garantir que o painel exiba os dados mais recentes disponíveis para cada loja no limite dessa data.
