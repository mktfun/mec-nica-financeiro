# Checklist de ImplementaçÁo: Spec 066

## Tasks

- [x] [BACKEND] Refatorar Hook Central (`src/hooks/useDashboardV2.ts`)
  - [x] Ao invés de buscar os "últimos 15 dias" para `historicoSaldos`, buscar todas as datas cujos dias pertençam ao **mesmo mês e ano** de `dateAtual`.
  - [x] Para cada data deste grupo mensal, consolidar o `saldo`, `faturamento` (de `import_logs` + manuais) e `contas` (`transactions` do tipo `out` e amount `< 0`).
  - [x] Mapear tudo para um novo array `historicoMacro` ordenado cronologicamente (do primeiro dia disponível do mês até o último).
- [x] [FRONTEND] Novo Gráfico (`src/components/dashboard/EvolucaoMacroChart.tsx`)
  - [x] Substituir o arquivo/componente `EvolucaoSaldoChart.tsx` por `EvolucaoMacroChart.tsx`.
  - [x] Renderizar as 3 métricas em `ComposedChart` ou `AreaChart` no Recharts, com Tooltips e Legendas.
- [x] [FRONTEND] Reestruturar Grid Base (`src/routes/index.tsx`)
  - [x] Inserir Hero Card com o `EvolucaoMacroChart` acima da tabela em `xl:col-span-3`.
  - [x] Limpar a barra lateral (`xl:col-span-1`) deixando apenas o gráfico `FaturamentoVsContasChart`.
- [x] [FRONTEND] Ajustar Gráfico Faturamento x Contas (`src/components/dashboard/FaturamentoVsContasChart.tsx`)
  - [x] Garantir `flex-1` e `h-full` para que expanda organicamente e ocupe todo o espaço lateral (`xl:col-span-1`).

## Status
COMPLETED
