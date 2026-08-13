# Spec Plan: Correção Crítica de Cartesian Product via CTEs (189)

## Tasks

- [x] [BACKEND] Criar arquivo de migration SQL (ex: `20260813140000_fix_cartesian_ctes.sql`).
- [x] [BACKEND] Na migration, reescrever a função `calculate_daily_conciliation(p_date)` trocando o cursor/FOR por CTEs isoladas e `LEFT JOIN`. Usar `jsonb_agg` para retornar o resultado de todas as lojas.
- [x] [BACKEND] Na migration, reescrever a função `get_dashboard_metrics(p_date)` da mesma forma: isolar as agregações em CTEs e consolidar o JSON final no SELECT, abolindo os joins inseguros/loops.
- [x] [FRONTEND] Inspecionar `src/hooks/useConciliacao.ts` em busca de double multiplication (`* 100`, `/ 100`) para certificar que nenhum centavo seja distorcido no pós-processamento.
- [x] [FRONTEND] Inspecionar `src/hooks/useBackendDashboard.ts` da mesma maneira.
- [x] [TEST] Executar um dry-run ou inspeção pós-migration para verificar se os números voltaram para as casas milhares ao invés de milhões.
