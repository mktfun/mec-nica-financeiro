# Spec Plan: 112-fix-backend-performance-and-ai (112)

**Status:** Implementado  
**Tipo:** Performance / Bugfix

## Tasks

- [x] [BACKEND] Criar arquivo de migration 20260807000004_fix_dashboard_perf.sql otimizando calculate_daily_conciliation e get_dashboard_metrics com os novos filtros temporais (PIX/Na Loja) e source IN ('rede', 'maquininha').
- [x] [BACKEND] Aplicar a migration ao Supabase via npx supabase db push.
- [x] [FRONTEND] Remover importação e hook de IA do arquivo src/routes/conciliacao.index.tsx.
- [x] [FRONTEND] Deletar os arquivos src/hooks/useBackgroundAiReconciler.ts e src/lib/llm-matcher.ts. para eliminar a dependência obsoleta (opcional se quiser manter como histórico, mas recomendável para não vazar execuções).
- [ ] [TEST] Verificar lentidão na tela principal de Conciliação Diária.

## Save-State
- Status Atual: Planejado
- Fase: 0
- Impedimentos: Nenhum
