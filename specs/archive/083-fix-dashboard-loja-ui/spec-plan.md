# Spec Plan: Fix Dashboard & Loja UI Consistency (083)

## Tasks

- [ ] [FRONTEND] Atualizar `src/components/conciliacao/ResumoDiaPanel.tsx` para garantir que o card "SALDO BANCO ITAÚ" mostre o Saldo Real e nÁo o total das entradas bancárias do dia. (Ou apenas renomear o label para "Faturamento Bancário" dependendo da fonte de dados disponível no painel).
- [ ] [FRONTEND] Em `src/routes/loja.$lojaId.tsx`: Mudar o comportamento de `getDefaultPeriod()` ou a lógica inicial para iniciar com o `startDate` e `endDate` iguais ao dia corrente ou dia útil anterior, em vez do mês completo, reduzindo impacto visual de dezenas de conciliações ao mesmo tempo.
- [ ] [FRONTEND] Em `src/routes/loja.$lojaId.tsx`: Atualizar as queries manuais de `concBanco`, `concSistema` e `concDespesas` (dentro do `useEffect`) para filtrar por `target_date` em vez de `occurred_at`.
- [ ] [TEST] Verificar Cenário 1: Dashboard card exibe saldo correto.
- [ ] [TEST] Verificar Cenário 2: Loja exibe totais congruentes baseados na data de conciliaçÁo (`target_date`), erradicando duplicidades percebidas por sobreposiçÁo mensal.
