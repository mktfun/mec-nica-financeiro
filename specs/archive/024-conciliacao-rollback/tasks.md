# Checklist: Refinamento sobre a Base Sólida (Spec 024)

## Fase 1: Data de Filtro Diário & Gráfico
- [ ] Refatorar os hooks em `useConciliacao.ts` (`useConciliacaoResumo` e `useConciliacaoDetalhes`) para extrair os dados exatamente do dia selecionado, não mais o mês (removendo `startOfMonth` e `endOfMonth`).
- [ ] Adicionar lógica de `expects_cash` para as lojas dentro do hook que alimenta a tela principal.
- [ ] Ajustar `useWeeklyRevenueTrend` (em `useTransactions.ts`) para receber um `anchorDate` (o dia selecionado) e computar a curva dos 14 dias anteriores a ele, resolvendo o bug do gráfico zerado.

## Fase 2: UI do Dashboard Principal (`src/routes/conciliacao.tsx`)
- [ ] Restaurar o código base de `acb4a52` (já feito via git checkout).
- [ ] Trocar o MonthPicker do cabeçalho por um `<input type="date" />`.
- [ ] Modificar o card "Dinheiro em Caixa · Hoje" para listar somente as lojas filtradas pelo `expects_cash`. Mostrar o aviso caso a lista seja vazia.
- [ ] Adicionar um minigráfico Sparkline (do Recharts) atrás do Card principal de "Total Entradas/Faturado" usando os dados reais de `useWeeklyRevenueTrend`.

## Fase 3: Navegação & Detalhes
- [ ] Restaurar `src/routes/conciliacao-detalhes.tsx` e certificar-se de que a rota `/conciliacao-detalhes` (ou `/loja/$id` que é para onde ele estava indo) existe. Espera, o código antigo aponta para `<Link to="/loja/${store.id}">`. Vamos validar para onde o usuário quer que vá. Como ele disse "tela de detalhes já existente", ele quer a tela da unidade específica, que o link antigo já provia!
- [ ] Garantir que não haja código inútil pendurado do teste do Revolut UI.
