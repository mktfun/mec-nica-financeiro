# Spec Plan: Dashboard Fintech V4 (064)

## Tasks

- [x] [BACKEND] Atualizar `src/hooks/useDashboardV2.ts`
  - [x] Receber `selectedDateStr?: string` como parâmetro
  - [x] Ajustar lógica de descoberta das datas: se `selectedDateStr` fornecido, tentar usá-lo como pivô, buscando no DB `dateAnterior` correspondente (menor estritamente)
  - [x] Ajustar a busca das `last15Dates` para serem `<= dateAtual`
- [x] [FRONTEND] Atualizar `src/routes/index.tsx`
  - [x] Adicionar state local `[selectedDate, setSelectedDate]`
  - [x] Passar `selectedDate` para `useDashboardV2(selectedDate)`
  - [x] Substituir o "Badge" com texto por um input interativo `<input type="date" />` estilizado
- [x] [FRONTEND] Melhorar UI de `src/components/dashboard/StoreTableDashboard.tsx`
  - [x] Transformar os dados da coluna Pátio em um layout empilhado (Qtd em cima, Valor embaixo) para salvar espaço horizontal
  - [x] Diminuir levemente os espaçamentos laterais (`px-2` em vez de mais) ou forçar larguras mínimas sensatas
  - [x] Garantir `overflow-x-auto` no container pai para scroll amigável
- [x] [TEST] Selecionar uma data passada com dados conhecidos
- [x] [TEST] Selecionar a data atual (sem dados) e verificar fallback gracioso (tudo zerado, mas sem quebrar)

## Status
COMPLETED
