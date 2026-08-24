# Spec Plan: Motor Dinâmico de Fechamento por Filiais, Deduplicação Automática e Resolução de RPC (280)

## Tasks

- [x] [BACKEND] Criar e aplicar migração SQL `20260824000010_drop_overloaded_rpc_and_fix_canonical_reconciliation.sql`:
  - Executar `DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date);` e `DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text);`
  - Criar única função canônica `public.get_daily_reconciliation_summary(p_date text)` que:
    - Agrega dinamicamente `SUM(amount)` de `daily_manual_bills` (para qualquer conta que o usuário lançar)
    - Agrega dinamicamente `SUM(amount)` de `daily_revenue_adjustments` (para qualquer sucata/ajuste que o usuário lançar)
    - Deduplica vendas e taxas de `pos_transactions` para evitar duplicação em re-importações
    - Soma `store_cash_vault` onde `status IN ('em_transito', 'pending')`
    - Retorna o array `stores` e `stores_detail` com as 10 filiais contendo todos os saldos bancários, cofre, maquininhas, PIX e pátio
- [x] [DATABASE] Sincronizar as 28 OSs reais em aberto em `patio_os` para 24/08 (R$ 88.212,39)
- [x] [DATABASE] Alinhar os status de `store_cash_vault` marcando o dinheiro creditado no banco como `depositado` e mantendo apenas o dinheiro físico não depositado (OS #586 e OS #1808) como `em_transito`
- [x] [FRONTEND] Validar que o hook `useBackendConciliacao.ts` e a página `/conciliacao` recebem `summary.stores` com sucesso e sem erro PGRST203
- [x] [TEST] Testar inserção dinâmica de conta manual e ajuste de receita e validar recálculo automático pela RPC
- [x] [TEST] Executar `npm run build` e confirmar compilação perfeita
