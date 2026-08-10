# Spec Plan: Navegação Inteligente de Datas na Conciliação (147-conciliacao-dates)

## Tasks

- [x] [FRONTEND] Criar hook `useAvailableConciliacaoDates` (por exemplo, em `src/hooks/useDailySnapshot.ts`) que faça uma query consultando as datas de `daily_snapshots` e `import_logs` retornando um array de datas únicas (YYYY-MM-DD) ordenadas de forma ascendente.
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.index.tsx` para chamar `useAvailableConciliacaoDates`.
- [x] [FRONTEND] Em `conciliacao.index.tsx`, refatorar o `useState` da `selectedDate` para não inicializar com `new Date()`, e usar um `useEffect` (ou lógica similar) que defina a data mais recente do array assim que a query estiver concluída (caso ainda não haja uma data na URL ou no state).
- [x] [FRONTEND] Atualizar a assinatura de `ResumoDiaPanelProps` em `src/components/conciliacao/ResumoDiaPanel.tsx` para aceitar `availableDates: string[]`.
- [x] [FRONTEND] Em `ResumoDiaPanel.tsx`, alterar o método `onDayChange(offset)` para encontrar o index da data atual em `availableDates` e, se for seta anterior (-1), mover para a data do `index - 1`. Se for +1, para `index + 1`. Se a data atual não estiver no array, deduzir a navegação lógica mais próxima ou usar Date offset como fallback.
- [x] [FRONTEND] Passar o prop `availableDates` de `conciliacao.index.tsx` para `<ResumoDiaPanel>`.
- [x] [TEST] Verificar cenário 1: Acessar `/conciliacao/` e checar se abre no dia correto da última conciliação (não hoje se hoje estiver vazio).
- [x] [TEST] Verificar cenário 2: Clicar seta esquerda no calendário salta dias vazios (ex: pula domingo se domingo não houver fechamento).
