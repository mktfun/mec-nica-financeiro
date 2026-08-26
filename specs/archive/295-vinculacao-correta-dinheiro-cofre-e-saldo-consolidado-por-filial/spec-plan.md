# Spec Plan: Vinculação de Dinheiro no Cofre e Saldo Consolidado por Filial (295)

## Tasks

### Fase 1 — Atualização da RPC get_daily_reconciliation_summary
- [x] [BACKEND] Atualizar `get_daily_reconciliation_summary` com CTE `store_vault` populando `dinheiro_loja` e `vault_entries` por `store_id`, e calculando `saldo_banco` como `OFX + Dinheiro + Maquininhas`
- [x] [BACKEND] Aplicar migration `20260826000005_fix_store_vault_and_consolidated_balance.sql` no Supabase

### Fase 2 — Refatoração de Resiliência no Frontend
- [x] [FRONTEND] Validar `SaldoBancosDetailModal.tsx` para garantir que os totais e as linhas consumam os dados calculados

### Fase 3 — Validação e Quality Gate
- [x] [TEST] Executar teste via PostgREST confirmando Santo André com R$ 350,00 e total consolidado de R$ 52.914,85 (9/9 testes passaram)
- [x] [TEST] Executar `npm run build` (Build 100% verde)
