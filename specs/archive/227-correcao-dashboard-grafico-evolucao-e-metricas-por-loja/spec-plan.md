# Spec Plan: Correção do Dashboard, Gráfico de Evolução Macro e Métricas por Loja (227)

## Tasks

- [ ] [FRONTEND/HOOKS] Atualizar `src/hooks/useBackendDashboard.ts`:
  - Corrigir mapeamento de `saldoAtual`, `veiculosPatio` e `veiculosPatioValor` em `porLoja`.
  - Integrar busca direta em `daily_snapshots` para preencher `historicoMacro` com a série temporal do mês.
  - Ajustar cálculo de `faturamentoAtual` vs `faturamentoAnterior` e `diferenca` contra a conciliação consolidada.
- [ ] [FRONTEND/VIEWS] Atualizar `src/routes/index.tsx` e `StoreTableDashboard.tsx` para garantir exibição correta dos saldos bancários por filial e veículos em pátio.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros.
- [ ] [GIT/SYNC] Sincronizar branches `main` e `master` no GitHub.
