# Spec Plan: Refatoração da Tela de Detalhes da Loja com Gráficos Analíticos e Macro Segmentação por Fornecedor (214)

## Tasks

- [ ] [BACKEND/MIGRATION] Criar e aplicar migration `supabase/migrations/20260817090000_create_store_analytic_breakdown_rpc.sql` com a RPC `get_store_analytic_breakdown` estruturada em CTEs isoladas e `SECURITY DEFINER`.
- [ ] [FRONTEND/HOOKS] Criar hook `src/hooks/useStoreAnalyticBreakdown.ts` que consome a RPC `get_store_analytic_breakdown` com cache e tratamento defensivo de nulos.
- [ ] [FRONTEND/LIB] Criar utilitário `src/lib/parsers/supplierUtils.ts` para normalização e agrupamento de fornecedores no frontend.
- [ ] [FRONTEND/COMPONENTS] Criar componente `src/components/lojas/LojaPieCharts.tsx` com gráfico Donut Recharts, seletor de 3 modos (`Receita x Despesa`, `Por Fornecedor`, `Por Origem`), centro informativo e tooltips flutuantes.
- [ ] [FRONTEND/PAGE] Atualizar `src/routes/loja.$lojaId.tsx` para:
  - Auto-selecionar a data mais recente com dados da loja via `useAvailableConciliacaoDates`.
  - Adicionar botões de atalho de período (`Último Fechamento`, `Últimos 7 dias`, `Mês Atual`, `Todo o Período`).
  - Integrar `LojaPieCharts` com sincronização contextual das abas.
  - Adicionar busca textual inline no extrato bancário.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo compilação TypeScript limpa e bundling verde.
- [ ] [TEST] Validar execução da RPC no Supabase e transição entre os modos de gráfico em todas as lojas.
