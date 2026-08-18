# Spec Plan: Faturamento Incremental no Gráfico Macro, Suporte a Saldo Negativo e Nomenclatura "Unidades" (229)

## Tasks

- [ ] [BACKEND/RPC] Atualizar `get_dashboard_metrics` no Supabase PostgreSQL:
  - Gerar `historicoMacro` com o faturamento incremental real de cada período/fechamento.
- [ ] [FRONTEND/COMPONENTS] Atualizar `StoreAnalyticsTabs.tsx`:
  - Tratar saldos negativos com alerta no Donut e badge/cor vermelha de destaque no ranking.
  - Substituir todas as ocorrências de "Filial" por "Unidade".
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros.
- [ ] [GIT/SYNC] Sincronizar branches `main` e `master` no GitHub.
