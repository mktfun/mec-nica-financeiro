# Spec Plan: Correção Definitiva de Duplicação de Contas e Resolução de R$ NaN por Filial (294)

## Tasks

### Fase 1 — Atualização da RPC get_daily_reconciliation_summary
- [x] [BACKEND] Criar migration `20260826000004_fix_contas_deduplication_and_store_metrics.sql` com deduplicação rigorosa de contas a pagar e agregação de `maquininha` e `pix` por loja
- [x] [BACKEND] Aplicar migration no Supabase via API Management

### Fase 2 — Refatoração de Resiliência no Frontend
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.index.tsx` com operadores de fallback para `maquininha`, `pix`, `previsto_ofx` e `diferenca`

### Fase 3 — Validação e Quality Gate
- [x] [TEST] Testar chamada da RPC via PostgREST comprovando `contas_manual` correto (1x) e array de lojas com `maquininha` e `pix` numéricos válidos (5/5 testes passaram, 0 NaNs)
- [x] [TEST] Executar `npm run build` para garantir ausência de erros (Build 100% verde)
