# Spec Plan: Equalização Canônica dos Saldos das 10 Filiais e Fechamento Diário (298)

## Tasks

### Fase 1 — Atualização Canônica da RPC get_daily_reconciliation_summary
- [x] [BACKEND] Refatorar a RPC `get_daily_reconciliation_summary` para computar `saldo_banco` por filial de forma canônica: `OFX + Cartões A Compensar (Rede Líquido - Crédito Rede Hoje) + Cofre`.
- [x] [BACKEND] Eliminar double-dipping no Caixa Atual (saldo negativo já abatido na soma algébrica dos bancos).
- [x] [BACKEND] Aplicar migration `20260826000008_canonical_store_balances_and_daily_closing.sql` no Supabase.

### Fase 2 — UI e Alinhamento Visual
- [x] [FRONTEND] Atualizar interface e exibição de saldos negativos/descoberto nos cards de filiais em `src/routes/conciliacao.index.tsx` e `src/routes/conciliacao.$lojaId.tsx`.

### Fase 3 — Validação e Quality Gate
- [x] [TEST] Executar teste automatizado comparando as 10 filiais com a planilha `CONCILIAÇÃO 2608.xlsx` (15/15 testes passaram com 100% de match).
- [x] [TEST] Executar `npm run build` (Build de produção 100% verde).
