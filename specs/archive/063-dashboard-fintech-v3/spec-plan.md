# Spec Plan: Dashboard Fintech V3 (063)

## Tasks

- [/] [BACKEND] Atualizar `src/hooks/useDashboardV2.ts` (ou criar V3)
  - [/] Remover input de `monthStr` da function signature
  - [/] Query inicial em `reconciliations` extraindo `dateAtual` e `dateAnterior` (TOP 2 dates distinct orderBy DESC)
  - [/] Refatorar a lógica de Faturamento para somar `os_total` de `dateAtual` (Atual) e `dateAnterior` (Anterior)
  - [/] Refatorar a lógica de Fluxo de Caixa (Saldo de dateAtual - Saldo de dateAnterior)
  - [/] Garantir que `Contas a Pagar` e `A Receber` continuem calculando o saldo global pendente atual
  - [/] Gerar array `historicoSaldos` buscando o SUM(bank_total) diário dos últimos 7-15 dias
- [x] [FRONTEND] Atualizar `src/components/dashboard/StoreTableDashboard.tsx`
  - [x] Adicionar nova coluna "Pátio (Qtd/R$)" extraindo `veiculosPatio` e `veiculosPatioValor` de cada loja
  - [x] Injetar `<tfoot>` nativo HTML no final da `<table>`
  - [x] Calcular dinamicamente o somatório das colunas: Saldo Atual, Faturamento, Contas, Resultado e Pátio
  - [x] Formatar e estilizar a linha de TOTAL com fonte em destaque
- [x] [FRONTEND] Criar `src/components/dashboard/EvolucaoSaldoChart.tsx`
  - [x] Componente Recharts `AreaChart`
  - [x] Usar gradiente para a área preenchida (`var(--color-accent-teal)`)
  - [x] Eixo X = Data, Eixo Y = Valor Financeiro oculto (exibido apenas no Tooltip)
- [x] [FRONTEND] Atualizar `src/routes/index.tsx`
  - [x] Remover `input type="month"` do header
  - [x] Renderizar texto informando a `dateAtual` extraída do hook (ex: "Ref: DD/MM/YYYY")
  - [x] Alterar as text-labels do card de Faturamento (remover mençÁo a "Mês", deixar "Atual", "Anterior" e "vs ANTERIOR")
  - [x] Incorporar o `EvolucaoSaldoChart` ao layout da faixa base (possivelmente 2 gráficos menores ou tabs)
- [x] [TEST] Verificar renderizaçÁo e crash em cenário sem dados (ex: conta nova)

## Status
COMPLETED
