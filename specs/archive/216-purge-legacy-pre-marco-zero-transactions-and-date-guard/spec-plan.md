# Spec Plan: Limpeza de Dados Pré-Marco Zero e Gráfico de Evolução Diária em 3 Linhas (216)

## Tasks

- [ ] [BACKEND/DATABASE] Criar migration `supabase/migrations/20260817093000_purge_legacy_pre_marco_zero.sql` e aplicar no banco purgando transações com `target_date < '2026-08-13'`.
- [ ] [FRONTEND/COMPONENTS] Criar componente `src/components/lojas/LojaEvolutionChart.tsx` com gráfico de linhas Recharts contendo 3 curvas (Entradas, Saídas, Saldo do Dia), legenda e tooltips.
- [ ] [FRONTEND/PAGE] Atualizar `src/routes/loja.$lojaId.tsx` para:
  - Integrar `LojaEvolutionChart` no card lateral "Evolução do Período".
  - Blindar datas mínimas em `2026-08-13`.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo compilação limpa.
- [ ] [TEST] Testar o gráfico de evolução temporal com 3 linhas no navegador.
