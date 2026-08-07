# Spec Plan: CorreçÁo de Crash ao Importar Arquivos do Dia 23 (fix-day23-crash)

## Tasks

- [x] [FRONTEND] Atualizar `src/hooks/useCentralImport.ts`:
  - [x] Adicionar filtro `isConsolidatedSummaryFile` para ignorar planilhas consolidadas manuais (ex: `CONCILIAÇÁO 2307.xlsx`).
  - [x] Implementar filtragem estrita de arquivos pelo `importMode` selecionado.
  - [x] Adicionar async chunking (`await new Promise(r => setTimeout(r, 0))`) no loop de processamento.
- [x] [FRONTEND] Atualizar `src/lib/parsers/redeParser.ts`:
  - [x] Adicionar validaçÁo de resiliência e fallback para relatórios da Rede sem data em linhas individuais.
- [x] [FRONTEND] Atualizar `src/hooks/useOsImportProcessor.ts`:
  - [x] Adicionar tratamento de data e `days_open` contra valores `NaN`.
- [x] [TEST] Testar compilaçÁo limpa (`npm run build`).
