# Spec Plan: Justificativa Completa de Saídas OFX e Equalização Matemática do Split nos Cards (335)

## Tasks

- [x] [BACKEND] Criar migration `supabase/migrations/20260901000012_fix_store_split_linear_subtraction_and_expenses.sql` ajustando a RPC `get_daily_reconciliation_summary` com `entradas_conciliadas` e cálculo blindado de `contas_loja_total`
- [x] [BACKEND] Aplicar migration via Management API e auditar retorno da RPC
- [x] [FRONTEND] Atualizar `src/hooks/useCategorizeOrphan.ts` para suportar `type = 'out'` chamando `resolve_orphan_saida_ofx` com invalidação coordenada de cache
- [x] [FRONTEND] Atualizar `src/components/conciliacao/StoreExtratoBancarioView.tsx` habilitando o botão "Justificar" para transações de saída e exibindo badges corretas
- [x] [FRONTEND] Atualizar `src/components/conciliacao/StoreCardModulo1.tsx` aplicando o Split de Subtração Linear ($A - B = C$) com sub-rótulos descritivos
- [x] [FRONTEND] Atualizar `src/components/conciliacao/ConciliacaoLojasView.tsx` com o repasse dos novos campos de reconciliação linear
- [x] [TEST] Executar Cenário 1: Testar justificativa de uma saída de R$ 4.151,00 em Planalto e verificar que `Dif. Saídas` zera
- [x] [TEST] Executar Cenário 2: Realizar Visual QA com Playwright validando clareza do split linear e Dark UI Zinc-950
