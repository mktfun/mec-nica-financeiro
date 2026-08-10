# Spec Plan: Upgrade de Deduplicação Global (import-dedup-upgrade)

## Tasks

- [x] [BACKEND] Criar arquivo de migration SQL (`supabase/migrations/XXX_add_pos_dedup_hash.sql`) para adicionar a coluna `dedup_hash` (TEXT) à tabela `pos_transactions` e criar a constraint UNIQUE para `(store_id, dedup_hash)`.
- [x] [BACKEND] Executar `supabase db push` ou rodar o script SQL para aplicar a migration.
- [x] [FRONTEND] Criar função helper global `generateDeterministicHash(date, amount, memo, prefix)` em `src/lib/parsers/numberUtils.ts` (ou arquivo dedicado) para sanitizar strings e produzir o hash antifrágil.
- [x] [FRONTEND] Modificar `src/lib/parsers/ofxParser.ts` para que todas as transações, sem exceção, ganhem o campo `FITID` gerado pelo nosso helper (substituindo o original).
- [x] [FRONTEND] Modificar `src/hooks/useTransactions.ts` para capturar `t.dedup_hash` vindo dos dados parseados da maquininha, e alterar de `.insert(posTxs)` para `.upsert(posTxs, { onConflict: 'store_id, dedup_hash', ignoreDuplicates: true })`.
- [x] [FRONTEND] Modificar `CentralImportWizard.tsx` e/ou `WizardImportacao.tsx` (quando processam maquininha) para atribuir o `dedup_hash` nas transações `posTxs` usando o helper criado.
- [x] [TEST] Verificar cenário 1: Importar o mesmo arquivo CSV/XLS de maquininha duas vezes (UI deve finalizar 100% mas o banco não deve subir a count de linhas).
- [x] [TEST] Verificar cenário 2: Simular OFX com FITIDs defeituosos e verificar se as transações sobrevivem ilesas no painel diário de conciliação.
