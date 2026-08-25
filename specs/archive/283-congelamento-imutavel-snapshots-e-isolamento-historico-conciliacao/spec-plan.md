# Spec Plan: 283 — Congelamento Imutável de Snapshots Fechados e Isolamento Histórico da Conciliação

## Tasks

- [x] [DATABASE] Criar migration `supabase/migrations/20260825000002_freeze_closed_snapshots_and_isolate_history.sql` adicionando `is_closed` e `closed_at` na tabela `daily_snapshots`.
- [x] [DATABASE] Consolidar e congelar os snapshots históricos oficiais com suporte a isolamento temporal e trava exclusiva.
- [x] [BACKEND] Atualizar a RPC `get_daily_reconciliation_summary` para retornar os dados congelados do snapshot para dias fechados e permitir agregação dinâmica viva para o dia atual ou modo forçado.
- [x] [FRONTEND] Atualizar o hook `useBackendConciliacao` e `ResumoDiaPanel.tsx` para exibir indicador visual de dia consolidado/fechado.
- [x] [TEST] Auditar retorno da conciliação do dia 24/08 garantindo aderência de 100% à planilha oficial com status approved.
- [x] [TEST] Executar build do frontend (`npm.cmd run build`) garantindo integridade de compilação e subir dev server no localhost:8080.
