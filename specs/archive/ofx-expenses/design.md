# Design: ofx-expenses

## Arquitetura Técnica
CentralImportWizard → useBulkInsertTransactions → Supabase (ofx_transactions)
A interceptação e normalização dos IDs será feita logo antes de inserir no Supabase. O array recebido de `CentralImportWizard` já contém todas as transações de OFX, mas precisamos garantir que o deduplicador em memória de `useBulkInsertTransactions` preserve a multiplicidade correta e aplique fallbacks.

## Componentes / Hooks / Funções
- **src/hooks/useTransactions.ts**: O hook principal que faz o bulk insert.
- `useBulkInsertTransactions` precisa filtrar transações do OFX corretamente, injetar sufixos em `fitid` duplicados, e passá-las para a inserção em `ofx_transactions`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: OFX tem 5 despesas diferentes de taxas, todas com `<FITID>` nulo.
  - Ação: Parser retorna `fitid: undefined`. Wizard injeta `null`.
  - Resultado esperado: `useBulkInsertTransactions` injeta o `.id` gerado pelo Wizard como `.fitid` para todas e salva com sucesso as 5.
- **Cenário 2**: OFX tem 5 despesas com o mesmo `<FITID>` ("20260807001").
  - Ação: Parser retorna "20260807001".
  - Resultado esperado: O hook aplica os sufixos `20260807001`, `20260807001_1`, `20260807001_2`, etc., e salva todas as 5 no banco de forma separada e segura.
- **Cenário 3**: Re-importação exata do Cenário 2.
  - Ação: Importa o mesmo arquivo OFX.
  - Resultado esperado: A mesma ordem de transações e quantidades geram os mesmos sufixos (`_1`, `_2`), então o Supabase ignora as inserções graças ao `ON CONFLICT ignore`. Idempotência mantida.
