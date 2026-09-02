# Spec Plan: Contabilização de Justificativas no Faturamento, Correção de Contas a Pagar e Split Dual de Entradas/Saídas nos Cards de Filiais (333)

## Tasks

- [x] [BACKEND] Criar migration `supabase/migrations/20260901000010_fix_revenue_adjustments_contas_and_store_split.sql` com compatibilidade universal de tipos em `daily_revenue_adjustments`, fallback seguro de `v_contas_manual` e enriquecimento da CTE `v_stores_detail` com o split de Entradas e Saídas por loja
- [x] [BACKEND] Aplicar migration via runner local e validar execução no Supabase
- [x] [FRONTEND] Atualizar interfaces em `src/hooks/useBackendConciliacao.ts` para tipar os campos de split de Entradas (`entradas_realizadas`, `entradas_previsto`, `diferenca_entradas`) e Saídas (`saidas_ofx`, `contas_loja`, `diferenca_saidas`)
- [x] [FRONTEND] Ajustar `src/hooks/useCategorizeOrphan.ts` para salvar `type: 'addition'` em `daily_revenue_adjustments` e invalidar todas as queries de conciliação
- [x] [FRONTEND] Corrigir `src/components/conciliacao/ResumoDiaPanel.tsx` para garantir que `contasManualValor` nunca seja forçado a R$ 0,00 quando houver base importada ou snapshot
- [x] [FRONTEND] Atualizar `src/components/conciliacao/ConciliacaoLojasView.tsx` e `src/components/conciliacao/StoreCardModulo1.tsx` implementando o layout dual-split (Entradas x Previsto e Saídas x Contas) mantendo o mesmo tamanho do card e tipografia `font-mono` nítida
- [x] [TEST] Executar Cenário 1: Validar Faturamento com entrada de Seguro Itaú somando `R$ 11.208,87` e Contas (Manual) exibindo `R$ 38.941,41` no dashboard
- [x] [TEST] Executar Cenário 2: Realizar Visual QA com Playwright validando os novos cards de lojas com o split dual de Entradas e Saídas
