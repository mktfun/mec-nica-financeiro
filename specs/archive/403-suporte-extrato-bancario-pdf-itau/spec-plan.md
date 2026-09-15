# Spec Plan: Suporte a Importação de Extrato Bancário em PDF (Itaú)

- [x] Tarefa 1: Desenvolver módulo parser `src/lib/parsers/itauPdfParser.ts` <!-- id: 1 -->
- [x] Tarefa 2: Integrar detecção automática no `centralImportManager.ts` <!-- id: 2 -->
- [x] Tarefa 3: Integrar fallback transparente em `ofxParser.ts` e `WizardImportacao.tsx` <!-- id: 3 -->
- [x] Tarefa 4: Atualizar `resolveStoreForOfx` e UI de importação em `CentralImportWizard.tsx` <!-- id: 4 -->
- [x] Tarefa 5: Validar E2E com `mp.pdf`, `mhe.pdf` e `modulo.pdf` e rodar build de produção <!-- id: 5 -->
