# Design: Advanced Trace Logging (102)

## Arquitetura Técnica
A topologia de logging se torna:
`CentralImportWizard` (Gera SessionID) -> `useCentralImport` (Recebe SessionID e repassa) -> Parsers Individuais (Emitem JSONs pesados com array total das extrações no estágio 2 e 3).

## Interfaces TypeScript
```typescript
// Em useCentralImport.ts
export function useCentralImport() {
  const processFiles = useCallback(async (files: File[], options?: { sessionId?: string }) => {
     // ...
     const result = await parseOFXFile(file, { sessionId: options?.sessionId });
     const osResults = await processOsFiles(excelFiles, { sessionId: options?.sessionId });
     // ...
  });
}

// Em useOsImportProcessor.ts
export async function processOsFiles(files: File[], options?: { sessionId?: string }): Promise<OsImportResult[]>
```

## Conteúdo do Log (Cenários de Verificação)
- **OFX (Estágio 2):** Array contendo objeto `{ id, date, amount, type }` para CADA transação no arquivo.
- **Pátio OS (Estágio 3):** Array contendo `{ os_number, total_value, paid_value, status }` e os recebíveis gerados `{ type, value, date }` para CADA ordem da planilha.
- **Rede (Estágio 3):** Array contendo `{ date, method, grossAmount, netAmount, interest }` para CADA linha.
- **Maquininha Genérica (Estágio 3):** Array contendo `{ storeName, amount, dateVenda, dateCredito }` para CADA linha.
