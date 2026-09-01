# Spec Plan: Correção da Diferença no Fechamento por Loja e Pendências OFX (332)

## Tasks

- [x] [BACKEND] Criar migration `supabase/migrations/20260901000009_fix_store_difference_and_ofx_pendencias.sql` atualizando `get_daily_reconciliation_summary` com a CTE canônica de pendências OFX por filial
- [x] [BACKEND] Aplicar migration via script local e verificar execução com sucesso
- [x] [FRONTEND] Atualizar interfaces em `src/hooks/useBackendConciliacao.ts` para refletir os novos campos e tipagens estritas
- [x] [FRONTEND] Corrigir `src/components/conciliacao/StoreCardModulo1.tsx` (typo "Diferena", formatação de R$ 0,00 e badges semânticos)
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.$lojaId.tsx` para sincronizar o header das 6 métricas com o card da loja
- [x] [TEST] Executar Cenário 1: Validar `/conciliacao?date=2026-09-01` e `/conciliacao/st-01?date=2026-09-01` com Dom Pedro exibindo Diferença R$ 0,00 e status Conciliado
- [x] [TEST] Executar Cenário 2: Validar tratamento de filiais com pendências reais e sem movimento
