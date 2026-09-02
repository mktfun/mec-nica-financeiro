# Spec Plan: Fluxo Seamless de Transição Automática para OCR e Injeção no Pipeline (Feature 347)

## Tasks

- [x] [BACKEND/PARSER] Criar módulo `src/lib/parsers/ocrOsAdapter.ts` com a função `convertOcrToOsImportResults` para sintetizar `OsImportResult[]` (`ParsedOS[]` + `ParsedReceivable[]`) a partir dos itens do OCR
- [x] [FRONTEND] Atualizar `src/components/importacoes/CentralImportWizard.tsx` adicionando `step === 1.5` (`STEP_OCR_INGESTION`) na máquina de estados do Wizard e na lista de fases
- [x] [FRONTEND] No `onDrop` do Step 1, detectar automaticamente `parsedResults.osFiles.length === 0` e disparar a transição imediata para `step = 1.5`
- [x] [FRONTEND] Integrar a interface embutida do Guia de Missão (`OcrBatchStoreCarryoverList`), Dropzone/Ctrl+V (`OcrBatchDropzoneAndPaste`), Progress (`OcrBatchProgressBar`) e Review Grid (`OcrBatchReviewGrid`) no Step 1.5 com botão "Salvar e Avançar Fluxo →"
- [x] [FRONTEND] No salvamento do Step 1.5, injetar as OSs sintéticas em `results.osFiles`, auto-registrar o `mapping` e transicionar para o Step 2/Step 3
- [x] [FRONTEND] Remover modal/botão avulso isolado que ficava fora do fluxo principal
- [x] [TEST] Executar teste Playwright validando o fluxo seamless: Upload sem XLS -> Auto-transição para Step 1.5 -> Ingestão de Print -> Avanço automático para Step 2/3
- [x] [VERIFY] Executar `npm run build` garantindo zero erros de compilação
