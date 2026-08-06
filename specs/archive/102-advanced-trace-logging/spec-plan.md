# Spec Plan: Advanced Trace Logging (102)

## Tasks

- [x] [ENGINE] Modificar `useCentralImport.ts`: Adicionar `options?: { sessionId?: string }` na assinatura de `processFiles` e no escopo de `processMaquininha`.
- [x] [ENGINE] Modificar `useCentralImport.ts`: Repassar o `options.sessionId` em todas as chamadas para `parseOFXFile`, `parseRedeFile`, `processOsFiles` e `processMaquininha`.
- [x] [ENGINE] Modificar `useOsImportProcessor.ts`: Aceitar `options?: { sessionId?: string }` na função `processOsFiles` e disparar log completo de `3_EXTRACTION_EXCEL` antes de retornar o objeto `OsImportResult`.
- [x] [ENGINE] Modificar `ofxParser.ts`: Substituir a amostra truncada (`slice(0,3)`) pelo mapeamento completo do array de `transactions`.
- [x] [ENGINE] Modificar `redeParser.ts`: Substituir a amostra truncada pelo mapeamento completo do array de transações da maquininha.
- [x] [ENGINE] Modificar `useCentralImport.ts`: Adicionar traceLog na função `processMaquininha` relatando os itens exatos identificados.
- [x] [FRONTEND] Atualizar `CentralImportWizard.tsx`: Chamar `processFiles(acceptedFiles, { sessionId })` passando o ID gerado, completando a ponte entre UPLOAD e EXTRACTION.
