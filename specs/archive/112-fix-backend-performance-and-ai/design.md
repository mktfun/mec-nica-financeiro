# Design: 112-fix-backend-performance-and-ai (112)

## Arquitetura Técnica
A conciliação volta a ser 100% baseada no fluxo SQL determinístico. A Inteligência Artificial será completamente desligada do pareamento de contas.

## Interfaces TypeScript
Nenhuma mudança de interface. Apenas a remoção do hook.

## Componentes / Hooks / Funções
1. **src/routes/conciliacao.index.tsx**:
   - Remover a invocação de useBackgroundAiReconciler(stores, selectedDate). A página passará a carregar de maneira síncrona aos dados bancários.

2. **20260807000004_fix_dashboard_perf.sql (Nova Migration)**:
   - Recriar calculate_daily_conciliation e get_dashboard_metrics aplicando:
     - source IN ('rede', 'maquininha') para que transações importadas com ambas as nomenclaturas sejam computadas.
     - PIX com limite temporal: (opened_at::date = p_date OR closed_at::date = p_date) para não somar 3 anos de história da oficina de uma vez.
     - Na Loja OS com limite temporal: (opened_at::date = p_date OR closed_at::date = p_date) para evitar Table Scan.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: Tentar acessar a conciliação diária de hoje. A página não pode demorar mais que 1 segundo, e não deve haver nenhuma requisição para Gemini (nenhum log 400).
- Cenário 2: Importar extrato maquininha (como maquininha). O valor precisa aparecer na métrica do painel superior.
