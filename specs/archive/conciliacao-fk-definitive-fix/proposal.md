# Proposal: Correção Definitiva de Chave Estrangeira em Conciliação e Importação (conciliacao-fk-definitive-fix)

## Problema

**Recorrência do Erro de Chave Estrangeira ao Confirmar Importação:**
`❌ Erro ao confirmar importação: insert or update on table "conciliation_matches" violates foreign key constraint "conciliation_matches_ofx_transaction_id_fkey"`

### Diagnóstico Técnico da Causa Raiz:
1. Ao importar extratos bancários OFX, a Central de Importação gera um novo `crypto.randomUUID()` no Javascript (`txId`) e associa esse `txId` em `matchesToInsert`.
2. Em seguida, envia as transações para a tabela `transactions` via `upsert(ofxTxs, { onConflict: 'store_id, fitid' })`.
3. Quando um registro OFX com o mesmo `fitid` e `store_id` **já existe no banco de dados**, o Postgres executa `UPDATE` mantendo a chave primária original existente (`id` antigo no DB).
4. O `txId` novinho gerado no Javascript **NUNCA é salvo no Postgres**. No entanto, `matchesToInsert` ainda tentava inserir esse `txId` novo na tabela `conciliation_matches`.
5. O Postgres verifica a Foreign Key `conciliation_matches_ofx_transaction_id_fkey` -> como o `txId` novo não existe em `transactions.id`, estoura o erro fatal!

## Solução Proposta

1. **Remapeamento com Chaves Reais do Banco de Dados (`CentralImportWizard.tsx`):**
   - Antes de salvar em `conciliation_matches`, buscar na tabela `transactions` do Supabase os `id`s reais dos registros inseridos/atualizados com base na chave composta `store_id + fitid`.
   - Atualizar `m.ofx_transaction_id` com a chave primária `id` real recuperada do banco de dados.

2. **Validação Sanitizada no Banco de Dados (Trava Anti-FK Crash):**
   - Fazer uma verificação física via `.in('id', Array.from(txIds))` diretamente na tabela `transactions` antes de disparar o `insert` em `conciliation_matches`.
   - Se por qualquer motivo um `ofx_transaction_id` ou `rede_transaction_id` não existir fisicamente na tabela `transactions`, atribuir `null` naquele campo.
   - O campo `ofx_transaction_id` na tabela `conciliation_matches` aceita `NULL` sem violar nenhuma constraint.

3. **Fallback Try-Catch com Recuperação Silenciosa:**
   - Envolver o salvamento de `conciliation_matches` em bloco try-catch resiliente com log explicativo no wizard, para que uma falha em pareamentos secundários jamais aborte o salvamento do lote de transações principais.

## Contratos de Dados
- **Tabela `conciliation_matches`**:
  - `ofx_transaction_id`: `UUID | null` (Sanitizado com os IDs reais de `transactions`)
  - `rede_transaction_id`: `UUID | null` (Sanitizado com os IDs reais de `transactions`)

## Features Existentes Impactadas
- `src/components/importacoes/CentralImportWizard.tsx` (Processador de salvamento)
- `src/hooks/useTransactions.ts` (Upsert de transações)

## Risco Principal
Garantir que a busca de IDs por `fitid` funcione corretamente para transações globais (`store_id = null`) e por loja.
*Mitigação:* Usar chave de busca `${store_id || 'null'}_${fitid}` no remapeamento.
