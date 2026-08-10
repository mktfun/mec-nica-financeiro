# Spec Plan: Fix Raw Data Modals (150)

## Tasks

- [x] [BACKEND] Criar migration `20260810170000_fix_raw_rpc_store_id_type.sql` recriando as 3 RPCs com `p_store_id text` (em vez de uuid) e corrigindo filtros de data: `opened_at::date` na OS, `target_date` na Rede e OFX. Para `stores.id` (que é uuid real), usar cast `p_store_id::uuid`.
- [x] [FRONTEND] Corrigir `src/components/conciliacao/ImportSourceBadges.tsx`: usar API real do `Modal` (`title` prop), remover header manual e remover `className` passado ao modal.
- [x] [FRONTEND] Corrigir `src/components/conciliacao/RawOsTable.tsx`: remover import inexistente `formatDate` de `@/lib/utils`. A função `format` do `date-fns` já está importada — usar ela diretamente.
- [x] [TEST] Verificar Cenário 1: clicar em "Pátio OS" → modal abre, tabela mostra dados reais (não vazia).
- [x] [TEST] Verificar Cenário 2: clicar em "Maquininha" → modal abre, tabela mostra transações de `pos_transactions` para a loja e data correta.
- [x] [TEST] Verificar Cenário 3: clicar em "Banco OFX" → exibe transações, limit e saldo anterior sem crash.
