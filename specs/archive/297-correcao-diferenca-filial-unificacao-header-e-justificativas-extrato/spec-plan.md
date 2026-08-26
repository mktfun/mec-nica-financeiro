# Spec Plan: Correção da Diferença por Filial, Header Unificado e Justificativas de Extrato (297)

## Tasks

### Fase 1 — Ajuste na RPC get_daily_reconciliation_summary
- [x] [BACKEND] Atualizar cálculo de `diferenca` na RPC `get_daily_reconciliation_summary` para somar apenas transações de extrato órfãs/pendentes (eliminando a falsa diferença com vendas D0)
- [x] [BACKEND] Aplicar migration `20260826000007_fix_store_real_divergence_and_justifications.sql` no Supabase

### Fase 2 — Sincronização de Justificativas e Header da Loja
- [x] [FRONTEND] Atualizar `src/hooks/useCategorizeOrphan.ts` para sincronizar `manual_category` e `manual_justification` em `ofx_transactions` e `transactions`
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.$lojaId.tsx` substituindo o banner redundante pelo Card Unificado de Fechamento por Filial

### Fase 3 — Validação e Quality Gate
- [x] [TEST] Testar via PostgREST confirmando Jabaquara com Diferença R$ 0,00 (extrato 100% conciliado) (3/3 testes passaram)
- [x] [TEST] Executar `npm run build` (Build 100% verde)
