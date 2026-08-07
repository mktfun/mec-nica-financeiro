# Design: ExtraçÁo do BALAMT no OFX

## Supabase MCP (Backend/Modelagem)
Nenhuma nova tabela ou coluna é necessária. Já temos `bank_total` em `reconciliations`. A query já lê essa tabela. O que muda é a ingestÁo de dados.
- O payload de importaçÁo passará a carregar `bankBalance` opcional.
- No `useImportProcessor.ts` (linha ~304), no bloco que faz `saveImportedReport.mutateAsync`, enviaremos esse `bankBalance` para o backend salvar na coluna `bank_total`.

## Stitch MCP (Frontend)
- `src/lib/parsers/ofxParser.ts`:
  - Usar Regex para pegar o bloco `<LEDGERBAL>` inteiro e depois extrair o `<BALAMT>([^\r\n<]+)`.
  - Converter para Float.
  - O retorno de `parseOFXFile` deixará de ser apenas `{ alias, transactions }` e passará a ser `{ alias, transactions, bankBalance }`.

- `src/components/importacoes/WizardImportacao.tsx`:
  - No `processOFX`, vai receber `bankBalance`.
  - Atualmente a página armazena um array mutável em `allParsedTransactions`. Mas precisamos de uma forma de vincular o saldo lido. 
  - Para nÁo quebrar a tipagem complexa, caso haja OFX na importaçÁo, ele pode definir um novo state `ofxBankBalance` no Wizard.

- `src/hooks/useImportProcessor.ts`:
  - A mutation vai precisar aceitar o `ofxBankBalance`.
  - Modificar os argumentos passados para o processor e enviá-lo durante o salvamento da ReconciliaçÁo (caso ele seja do tipo OFX).
