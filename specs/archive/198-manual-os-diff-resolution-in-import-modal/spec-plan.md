# Spec Plan: Manual OS Diff Resolution in Import Modal (198)

## Tasks

- [x] [FRONTEND/WIZARD] No `src/components/importacoes/CentralImportWizard.tsx`, implementar a busca no Supabase de OSs ativas e detecção das **OSs Ausentes** no relatório atual ao avançar para a etapa de Preview (Step 3).
- [x] [FRONTEND/UI] No `src/components/importacoes/CentralImportWizard.tsx`, renderizar a tabela manual de **"OSs Pendentes Ausentes no Relatório Atual"** com inputs livres para `Valor Total`, `Total Pago` e `<select>` de `Status`.
- [x] [BACKEND/PERSISTENCE] No `src/components/importacoes/CentralImportWizard.tsx`, incluir o update em lote das OSs ausentes editadas na rotina de gravação (`handleConfirm` no Step 4).
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo TypeScript limpo e bundling 100% verde.
- [x] [TEST] Testar o fluxo completo de detecção de OSs ausentes, edição manual na tabela e persistência em lote.
