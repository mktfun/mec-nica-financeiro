# Spec Plan: Correção de Erros de Console, Ícone Car e Desambiguação de RPCs (369)

## Tasks

- [x] [BACKEND] Criar migration `supabase/migrations/20260904000032_unify_reconciliation_summary_and_fix_auto_match.sql`
  - Dropar todas as sobrecargas prévias de `public.get_daily_reconciliation_summary` (`text` e `text, boolean`)
  - Recriar a função canônica única `public.get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)` com suporte bicanal consolidado e `GRANT EXECUTE`
  - Atualizar `public.run_autonomous_reconciliation_loop(p_date text)` com chamada explícita de 2 parâmetros `get_daily_reconciliation_summary(p_date, false)`
  - Atualizar `public.auto_match_daily_transactions(p_date text)` com `SELECT * INTO v_os_record FROM public.patio_os ...` em todas as 6 queries que alimentam `v_os_record` (Fases 1 e 2) para casar a assinatura de `patio_os%ROWTYPE` e eliminar erros `22P02` e `55000`
  - Garantir que `public.get_daily_reconciliation_summary` desconsidere o snapshot fechado para `status_geral` quando `p_force_dynamic = true`
- [x] [FRONTEND] Corrigir `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`
  - Importar `Car` de `lucide-react` para eliminar `ReferenceError: Car is not defined`
  - Atualizar hook para `useDailyReconciliationSummary(targetDate, true)` garantindo auditoria dinâmica
  - Limpar asserções inseguras de tipo `(summary as any)` usando as tipagens nativas do hook
- [x] [FRONTEND] Atualizar `src/hooks/useBackendConciliacao.ts`
  - Expandir a interface `DailyReconciliationSummary` com os campos bicanais (`caixa_tesouraria`, `status_tesouraria`, `patio_wip`, `variacao_patio_delta_p4`, `fast_path_eligible`)
  - Atualizar `useDailyReconciliationSummary(date: string, forceDynamic: boolean = false)` passando `p_force_dynamic` ao RPC e na `queryKey`
- [x] [TEST] Aplicar migration remota via Supabase CLI e validar execução no PostgreSQL
  - Executar `SELECT public.get_daily_reconciliation_summary('2026-09-03');` garantindo unicidade e sem erro 42725
  - Executar `SELECT public.run_autonomous_reconciliation_loop('2026-09-03');` garantindo HTTP 200 / sem erro 400
  - Executar `SELECT public.auto_match_daily_transactions('2026-09-03');` com OS de cliente textual garantindo sem erro 22P02
- [x] [TEST] Executar `bun run build` garantindo compilação limpa sem erros de tipagem ou referências ausentes
