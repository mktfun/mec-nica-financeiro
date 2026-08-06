# Spec Plan: Trace Logs Estruturados (101)

## Tasks

- [x] [ENGINE] Criar `src/lib/logger.ts` com a estrutura `traceLog` e `generateSessionId`.
- [x] [ENGINE] Editar `src/lib/parsers/ofxParser.ts` para receber `sessionId?` nos parâmetros (via objeto options) e disparar o log `2_EXTRACTION_OFX` antes do `return`.
- [x] [ENGINE] Editar `src/lib/parsers/redeParser.ts` (e/ou parsers relevantes) para receber `sessionId?` e disparar o log `3_EXTRACTION_EXCEL`.
- [x] [FRONTEND] Editar `src/components/importacoes/WizardImportacao.tsx`
  - Instanciar `sessionId` no `onDrop` (pode ser salvo num ref ou let local se o processamento for num fluxo único).
  - Disparar `1_UPLOAD` no `onDrop`.
  - Disparar `4_NORMALIZATION` e `5_MATCHING_ENGINE` (se houver regras locais).
  - Disparar `6_STAGING_READY` com o número total de inserts e payload final.
- [x] [FRONTEND] Editar `src/components/importacoes/CentralImportWizard.tsx`
  - Repetir as integrações do `WizardImportacao` no wizard centralizado.
