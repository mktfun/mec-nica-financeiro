# Tasks: Extração do BALAMT no OFX

## Backend (Supabase MCP / Lógica de Negócio)
- [ ] Editar `src/lib/parsers/ofxParser.ts`.
- [ ] Atualizar o tipo `OfxParseResult` para incluir `bankBalance?: number`.
- [ ] Na função `parseOFXFile`, adicionar uma Regex para extrair a tag `<LEDGERBAL>` inteira, e de dentro dela extrair `<BALAMT>([^\r\n<]+)`. Fazer o cast para float e retornar `bankBalance`.
- [ ] Editar `src/hooks/useImportProcessor.ts`.
- [ ] Adicionar um novo campo no input do hook de importação para suportar a passagem do `ofxBankBalance?: number`.
- [ ] No trecho onde é feito `saveImportedReport.mutateAsync`, injetar o `bank_total: ofxBankBalance` para que ele grave este valor diretamente na tabela `reconciliations` ao importar os dados (Pode ser necessário adicionar o campo a mutation `saveImportedReport`).
- [ ] Editar `src/hooks/useConciliacao.ts` para garantir que o `saveImportedReport` aceita o `bank_total` via payload e o envia no `upsert`.

## Frontend (Stitch MCP)
- [ ] Editar `src/components/importacoes/WizardImportacao.tsx`.
- [ ] Adicionar um estado `const [extractedBankBalance, setExtractedBankBalance] = useState<number | null>(null)`.
- [ ] No `onDrop`, após chamar `await parseOFXFile(file)`, se a resposta tiver `bankBalance`, salvar no estado `setExtractedBankBalance`.
- [ ] Quando o usuário clicar em "Confirmar Importação" e a função que envia para a mutation for invocada, garantir que ela repasse o `ofxBankBalance: extractedBankBalance` no payload do `processImport`.
- [ ] (Opcional UX) No `Passo 2` ou `Passo 3` do Wizard, exibir em algum cantinho uma tag `<Badge>Saldo de R$ XXXX capturado</Badge>` para dar feedback ao usuário de que a extração do saldo final da conta funcionou.
