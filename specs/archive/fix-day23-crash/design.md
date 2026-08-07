# Design: CorreçÁo de Crash ao Importar Arquivos do Dia 23 (fix-day23-crash)

## Arquitetura Técnica

```
[SeleçÁo de Arquivos / Drag & Drop no Wizard]
       │
       ├──► Filtro 1: Descarta planilhas consolidadas (ex: "CONCILIAÇÁO 2307.xlsx")
       │
       ├──► Filtro 2: Aplica filtro do importMode (rede | os | ofx)
       │
       └──► Processamento Assíncrono com Async Chunking (yield a cada 100 linhas)
             ├─► parseRedeFile()   (ValidaçÁo de cabeçalho "EXTRATO PARA SIMPLES CONFERÊNCIA")
             ├─► processOsFiles()  (Batch parsing resiliente com limite de linhas)
             └─► Retorno imediato para a UI sem congelar o navegador
```

## Componentes / Hooks Afetados

1. **`src/hooks/useCentralImport.ts`:**
   - Adicionar helper `isConsolidatedSummaryFile(file: File): boolean` para ignorar arquivos como `CONCILIAÇÁO 2307.xlsx`.
   - Adicionar filtragem por `importMode` no `processFiles`.
   - Adicionar `await new Promise(r => setTimeout(r, 0))` entre arquivos para nÁo travar a renderizaçÁo do React.

2. **`src/lib/parsers/redeParser.ts`:**
   - Adicionar verificaçÁo de `json.length > 500` para abortar se o arquivo nÁo for um relatório de vendas padrÁo da Rede.
   - Adicionar resiliência no fallback de datas caso a linha do Excel nÁo traga o formato `DD/MM/YYYY`.

3. **`src/hooks/useOsImportProcessor.ts`:**
   - Adicionar `await new Promise(r => setTimeout(r, 0))` a cada 50 linhas de OS processadas.
   - Tratar datas inválidas (`NaN`) no cálculo de `days_open` para evitar valores nulos/quebrados.

## Cenários de VerificaçÁo

### Cenário 1: Drag and Drop da Pasta Completa do Dia 23 (`concilia1`)
- **Entrada:** ImportaçÁo em lote contendo `CONCILIAÇÁO 2307.xlsx` + 10 arquivos `.xls` de OS + 7 arquivos `.xlsx` da Rede.
- **Resultado Esperado:** `CONCILIAÇÁO 2307.xlsx` é ignorado com aviso. Todos os 10 arquivos de OS e 7 arquivos da Rede sÁo processados em 2 a 3 segundos sem congelar o navegador.

### Cenário 2: ImportaçÁo com Modo 'rede' Ativo
- **Entrada:** Usuário clica no Card "Apenas REDE" e faz upload dos arquivos do dia 23.
- **Resultado Esperado:** O wizard processa apenas os relatórios da Rede, ignorando planilhas `.xls` de OS e planilhas consolidadas.
