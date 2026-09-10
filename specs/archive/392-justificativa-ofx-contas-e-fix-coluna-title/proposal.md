# Proposal: Spec 392 - Correção da Coluna 'title' em OFX, Sincronização de Justificativas e Reatividade do Contas a Pagar

## 1. Contexto e Problema
Ao utilizar a Central de Conciliação e o Extrato Bancário Completo da Filial (`StoreExtratoBancarioView`):
1. **Erro 400 Bad Request (Postgres code `42703` - `undefined_column`):**
   - O hook `useHistoricalReconciledTransactions` (`src/hooks/useTransactions.ts`, linha 381) executa:
     ```typescript
     .select('id, fitid, store_id, target_date, occurred_at, manual_category, manual_justification, matched_os_number, match_status, title, amount')
     ```
   - A tabela `ofx_transactions` **não possui** a coluna `title` (suas colunas descritivas são `counterpart_name` e `bank_name`).
   - A requisição falhava silenciosamente com 400 no endpoint Supabase REST, deixando `historicalReconciled = []` e quebrando a herança de histórico e correspondência de memória no extrato.

2. **Justificativa de Débito Bancário OFX permanecendo com Badge "PENDENTE":**
   - O usuário justificou um débito de R$ 100.000,00 (`APLICACAO CDB DI`, FITID `ofx_20260909100000_100000.00_aplicacaocdbdi`, loja `st-03`) com a opção "Somar ao Contas a Pagar".
   - A transação continuou exibindo o badge **`• PENDENTE`** no extrato da loja por quatro razões:
     a) `StoreExtratoBancarioView` lê de `transactions` via `useStoreExtratoBancario`.
     b) A RPC `resolve_orphan_saida_ofx` atualiza `ofx_transactions` e insere em `daily_manual_bills`, mas **não atualiza `transactions`** (apenas o fallback de erro fazia isso).
     c) O cálculo de `linkedBill` procurava apenas por `tx.matched_bill_id`, que não existia na tabela `transactions`.
     d) As queryKeys de invalidação do React Query estavam dessincronizadas (`['daily-manual-bills']` com hífen vs `['daily_manual_bills']` com underscore no hook consumidor).

3. **Despesa Justificada não refletindo no Subtotal de Contas:**
   - A conta foi inserida com sucesso em `daily_manual_bills` (R$ 100.000,00, `is_extra: true`, `contabilizar_no_subtotal: true`).
   - No entanto, a view não atualizou a listagem devido ao cache dessincronizado (`['daily-manual-bills']`), e os fechamentos já selados em `daily_snapshots` congelavam o valor anterior gravado em `metadata->>'subtotal_contas'` (62.051,41) sem incorporar dinamicamente a despesa extra inserida.

---

## 2. Solução Proposta

### A. Correção da Query em `useTransactions.ts`
- Alterar a seleção em `useHistoricalReconciledTransactions`:
  - Remover `title` do `.select()` em `ofx_transactions`.
  - Adicionar `counterpart_name, bank_name`.
  - Mapear os registros retornados gerando `title: t.counterpart_name || t.bank_name || ''`, garantindo compatibilidade total com os consumidores que leem `h.title`.

### B. Sincronização Canônica em `useCategorizeOrphan.ts`
- Ao resolver uma saída (`type === 'out'`):
  - Chamar `resolve_orphan_saida_ofx`.
  - Atualizar imediatamente a tabela `transactions` com `manual_category = finalCategory` e `manual_justification = finalJustification` para o ID da transação, mantendo ambas as tabelas sincronizadas.
  - Padronizar a invalidação de cache invalidando simultaneamente:
    - `['daily_manual_bills']` E `['daily-manual-bills']`
    - `['daily_reconciliation_summary']` E `['daily-reconciliation-summary']`
    - `['transactions']`
    - `['ofx_transactions']`
    - `['store_extrato_bancario']`
    - `['historical_reconciled']`

### C. Refinamento de Detecção e Badges em `StoreExtratoBancarioView.tsx`
- Enriquecimento inteligente:
  - Localizar `linkedBill` de forma bidirecional: `dailyBills.find(b => b.id === tx.matched_bill_id || b.matched_ofx_id === tx.id)`.
  - Se houver `linkedBill` ou `tx.manual_category`: garantir que `isPending = false`.
  - Adicionar badge visual claro para transações justificadas/vinculadas:
    - Se houver `matchedBill`: exibir badge `Conta: {nome}` (estilo teal).
    - Se houver `manual_category`: exibir badge `Justificado: {categoria}` (estilo purple).
    - O badge `• PENDENTE` só será exibido se a transação realmente não tiver nenhum vínculo, categoria ou justificativa.
  - Em `handleCategorizationSuccess`, invalidar também `['daily_manual_bills']` e `['transactions']`.

---

## 3. Arquivos Impactados
1. `src/hooks/useTransactions.ts` (Linhas 374-406)
2. `src/hooks/useCategorizeOrphan.ts` (Linhas 33-64 e 134-150)
3. `src/components/conciliacao/StoreExtratoBancarioView.tsx` (Linhas 122-192, 592-603 e 1020-1050)

---

## 4. Critérios de Sucesso
- [x] Zero erros 400 Bad Request no console ao abrir o Extrato Bancário.
- [x] Transações justificadas não exibem mais o badge `• PENDENTE`.
- [x] Débito de R$ 100.000,00 da Jorge Beretta exibe badge de Justificado/Vinculado com o nome do favorecido.
- [x] Contas a pagar da data reflete a nova conta criada tanto no Extrato quanto no Fechamento.
