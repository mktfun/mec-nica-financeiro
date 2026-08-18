# Spec Plan: Diagnóstico da Conciliação de 18/08, Cartões a Compensar e Persistência por Data (231)

## Tasks

- [ ] [FRONTEND/COMPONENTS] Atualizar `ResumoDiaPanel.tsx`:
  - Permitir edição e ajuste de `Saldo Bancos / Cartões a Compensar` e `Na Loja OS`.
  - Isolar o carregamento dos 5 pilares por data baseando-se estritamente no snapshot congelado da data quando existir.
  - Gravar `diferenca_final` e métricas completas no snapshot ao salvar.
- [ ] [DATABASE/RPC] Ajustar RPC `get_daily_reconciliation_summary` e `get_dashboard_metrics` para considerar os snapshots diários persistidos de cada data.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros.
- [ ] [GIT/SYNC] Sincronizar branches `main` e `master` no GitHub.
