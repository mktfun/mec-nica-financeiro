# Design: Corrigir Violação de Unique Constraint em OFX (091-fix-ofx-unique-constraint)

## Arquitetura Técnica
`CentralImportWizard` (React Component) -> `ofxTxs` Array (deduplicado em memória por fitid) -> `useBulkInsertTransactions` -> Tabela `transactions` (via upsert com `ignoreDuplicates`).

## Interfaces TypeScript
N/A (Reaproveitaremos as existentes).

## Componentes / Hooks / Funções
- `src/hooks/useTransactions.ts`
  - Função: `useBulkInsertTransactions`
  - Responsabilidade: Substituir `.insert(ofxTxs)` por `.upsert(ofxTxs, { onConflict: 'store_id, fitid', ignoreDuplicates: true })`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Importar lote contendo um extrato OFX com `fitid` de um dia anterior que já existe na base.
  - *Resultado esperado:* Supabase ignora as transações antigas e insere as do dia correto, sem falhar com constraint error.
- **Cenário 2:** Importar duas vezes seguidas a mesma data.
  - *Resultado esperado:* O comando Delete-then-Insert é honrado (delete apaga os do dia, e upsert insere do zero perfeitamente).
