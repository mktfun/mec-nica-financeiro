# Spec Plan: Correção Definitiva da RPC de Conciliação, Higienização do Backend e Blindagem de Performance (285)

## Tasks

- [x] [BACKEND] Criar migração `20260825000004_fix_canonical_reconciliation_and_performance.sql`
  - Dropar todas as sobrecargas antigas de `get_daily_reconciliation_summary`
  - Corrigir o Ramal 1 (dias fechados) removendo `r.pix_total` e `r.rede_total`
  - Corrigir o Ramal 2 (dias abertos) restaurando o Saldo Bancário patrimonial das filiais
  - Otimizar CTEs e criar índices de performance em `ofx_transactions`, `pos_transactions`, `store_cash_vault` e `patio_os`
  - Re-homologar `is_closed = true` nos snapshots de 17, 18, 19, 21 e 24/08 com seus metadados oficiais
- [x] [BACKEND] Aplicar migração no Supabase remotamente e validar recarregamento do schema PostgREST
- [x] [FRONTEND] Ajustar `src/hooks/useBackendConciliacao.ts` para garantir sincronia com os tipos da RPC
- [x] [FRONTEND] Verificar que nenhum componente de conciliação ou recebíveis realiza cálculos matemáticos no client
- [x] [TEST] Executar script de regressão automatizado para testar todas as datas (17/08 a 25/08) garantindo HTTP 200, latência < 50ms e precisão contábil
- [x] [TEST] Testar navegação fluida no frontend e geração de logs sem erros no console
