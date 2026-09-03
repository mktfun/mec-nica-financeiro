# Spec Plan: Correção de `occurred_at` em `pos_transactions` e Blindagem de Contratos na Esteira Manual (363)

## Tasks

- [x] [FRONTEND] Corrigir contrato de inserção de `pos_transactions` em `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx`:
  - [x] Compor `occurred_at` com formato ISO 8601 UTC a partir de `t.date` e `t.time` (com fallback `${targetDate}T12:00:00Z`).
  - [x] Mapear `fee_amount` com base em `t.interest` (e fallback `t.feeAmount`).
  - [x] Mapear `transaction_type` ('venda' ou 'devolucao').
  - [x] Gerar `dedup_hash` com `generateDeterministicHash` para garantir idempotência.
  - [x] Sanitizar `store_id` (persistir `null` em vez de `'st-default'` para evitar violação de Foreign Key).
  - [x] Deduplicar em memória via `Map` e trocar `.insert()` por `.upsert(txsToInsert, { onConflict: 'store_id, dedup_hash', ignoreDuplicates: true })`.

- [x] [FRONTEND] Saneamento preventivo do contrato de `ofx_transactions` em `src/components/importacoes/manual/Fase3OfxReconciliation.tsx`:
  - [x] Adicionar `bank_name` (extraído do alias ou 'Itaú') e `occurred_at` (NOT NULL no schema).
  - [x] Mapear `counterpart_name` (substituindo a coluna inexistente `description`) e `fitid`.
  - [x] Sanitizar `store_id` (substituir `'st-default'` por `null`).
  - [x] Deduplicar em memória e trocar `.insert()` por `.upsert(txsToInsert, { onConflict: 'store_id, fitid', ignoreDuplicates: true })`.
  - [x] Corrigir mapeamento em `loadOfxData` para ler `counterpart_name` e `occurred_at`.

- [x] [FRONTEND] Saneamento preventivo do contrato de `daily_manual_bills` em `src/components/importacoes/manual/Fase4ContasVsSaidasReview.tsx`:
  - [x] Mapear `title` (obrigatório NOT NULL) a partir de `b.description || b.title`.
  - [x] Remover campo inexistente `status: 'pendente'` do payload de inserção.
  - [x] Atualizar `loadData` para ler `counterpart_name` em vez de `description`/`title`.
  - [x] Corrigir parâmetro da RPC `auto_match_saidas` para `{ p_date: targetDate }`.
  - [x] Sanitizar `store_id` (substituir `'st-default'` por `null`).

- [x] [TEST] Validação e Build:
  - [x] Executar typecheck e build (`bun run build`).
  - [x] Validar conformidade de tipos com `src/integrations/supabase/types.ts`.
