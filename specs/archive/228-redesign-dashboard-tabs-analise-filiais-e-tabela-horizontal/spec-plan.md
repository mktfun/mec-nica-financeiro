# Spec Plan: Redesign do Dashboard com Tabs de Análise por Filial e Tabela de Resultado Horizontal (228)

## Tasks

- [ ] [FRONTEND/COMPONENTS] Criar `src/components/dashboard/StoreAnalyticsTabs.tsx`:
  - Navegação fluida entre 3 abas: Saldo Bancário, Faturamento (OFX) e Contas (OFX).
  - Donut chart dinâmico com paletas dedicadas para cada dimensão.
  - Painel analítico lateral com KPIs da dimensão e ranking com barras de progresso proporcionais para as 10 lojas.
- [ ] [FRONTEND/VIEWS] Atualizar `src/routes/index.tsx`:
  - Reorganizar a estrutura vertical em dois blocos horizontais completos: `StoreAnalyticsTabs` no topo e `StoreTableDashboard` logo abaixo.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros.
- [ ] [GIT/SYNC] Sincronizar branches `main` e `master` no GitHub.
