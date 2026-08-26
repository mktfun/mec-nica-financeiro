# Spec Plan: Refatoração Dashboard Enterprise (288)

## Tasks

### Fase 1 — Infraestrutura de Formatação
- [ ] [LIB] Criar `src/lib/formatters.ts` com `formatCurrencyBRL()`, `formatCompactBRL()`, `formatAxisBRL()`
- [ ] [LIB] Ajustar `src/lib/utils.ts` → `formatCurrency()` para fixar `minimumFractionDigits: 2, maximumFractionDigits: 2`

### Fase 2 — Tabela de Resultado por Loja
- [ ] [FRONTEND] Refatorar `StoreTableDashboard.tsx`: substituir `fmt()` local por import de `formatCurrencyBRL`
- [ ] [FRONTEND] Aplicar `text-right` nos headers e cells monetários
- [ ] [FRONTEND] Aplicar `text-left` no header e cells de nome da loja
- [ ] [FRONTEND] Aplicar `py-3.5 px-4` uniforme, `divide-y divide-zinc-800/60`, `hover:bg-zinc-800/40`
- [ ] [FRONTEND] Adicionar coluna "Status" com `<Badge>` para `statusConciliacao`
- [ ] [FRONTEND] Substituir `<span>` inline de "Negativo" por `<Badge variant="danger">`
- [ ] [FRONTEND] Aplicar `tabular-nums` em todas as cells monetárias
- [ ] [FRONTEND] Uniformizar footer (`tfoot`) com alinhamento idêntico

### Fase 3 — KPI Cards
- [ ] [FRONTEND] Ajustar `KpiCard.tsx` para garantir 2 decimais fixas via `formatCurrencyBRL`
- [ ] [FRONTEND] Adicionar micro-sparkline de tendência nos KPI cards (dados do `historicoMacro`)
- [ ] [FRONTEND] Passar prop `sparklineData` de `index.tsx` para `KpiCard`

### Fase 4 — Gráficos
- [ ] [FRONTEND] Refatorar `EvolucaoMacroChart.tsx`: dots menores, grid horizontal only, gradiente saldo, tooltip refinado
- [ ] [FRONTEND] Substituir `formatCurrency` / `formatCompact` locais por imports de `formatters.ts`
- [ ] [FRONTEND] Refatorar `StoreAnalyticsTabs.tsx`: ring externo no donut, ranking bars com gradiente, `tabular-nums`
- [ ] [FRONTEND] Substituir `formatCurrency` / `formatCompact` locais por imports de `formatters.ts`

### Fase 5 — Rota Principal
- [ ] [FRONTEND] Ajustar `index.tsx`: passar `historicoMacro` para KPI cards, limpar imports não usados
- [ ] [FRONTEND] Refinar card de Faturamento para 2 decimais fixas e formatação consistente
- [ ] [FRONTEND] Refinar banner de Pátio para usar `formatCurrencyBRL`

### Fase 6 — Verificação
- [ ] [TEST] `npm run build` — build de produção sem erros
- [ ] [TEST] Verificar formatação monetária: todos os valores com 2 decimais
- [ ] [TEST] Verificar alinhamento: colunas monetárias à direita, texto à esquerda
- [ ] [TEST] Verificar badges de status na tabela
- [ ] [TEST] Verificar que telas de conciliação/recebíveis não sofreram regressão
