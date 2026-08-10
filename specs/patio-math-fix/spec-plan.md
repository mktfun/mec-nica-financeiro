# Spec Plan: Corrigir Matemática de "Na Loja OS" (patio-math-fix)

## Tasks

- [x] [FRONTEND] Modificar `src/hooks/useDashboardV2.ts` para que `veiculosPatioValor` faça o `reduce` computando `Math.max(0, Number(os.total_value || 0) - Number(os.paid_value || 0))` ao invés de apenas `Number(os.total_value || 0)`.
- [x] [FRONTEND] Modificar `src/hooks/useDashboardV2.ts` para que a acumulação por loja (`patioByStore[os.store_id].valor`) também compute `Math.max(0, Number(os.total_value || 0) - Number(os.paid_value || 0))` ao invés de apenas `Number(os.total_value || 0)`.
- [x] [BACKEND] Criar nova migration SQL para atualizar a função `calculate_daily_conciliation`, removendo o bloco `IF v_historical_na_loja IS NOT NULL` do "Na Loja OS" e inserindo um bloco que selecione da tabela `patio_os` a soma de `total_value - paid_value` APENAS onde `opened_at::date = p_date OR closed_at::date = p_date`.
- [x] [BACKEND] Aplicar a migration com `supabase db push` ou rodar na cloud.
- [x] [TEST] Garantir que o valor exibido na UI coincida com a coluna "Restante na OS" tanto no pátio global quanto no fechamento diário por arquivo.
