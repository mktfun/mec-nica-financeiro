# Spec Plan: Ingestão de OSs via Mistral OCR/Vision (Aba Pagamentos) e Auto-Pareamento (345)

## Tasks

- [x] [BACKEND] Criar migration `20260902000020_create_batch_upsert_patio_os.sql` com a RPC `batch_upsert_patio_os` implementando merge defensivo, gravação dos métodos de pagamento e sincronização com `store_cash_vault`
- [x] [BACKEND] Aplicar a migration no banco Supabase e validar execução da RPC
- [x] [FRONTEND] Adicionar chave `VITE_MISTRAL_API_KEY` e criar o hook `src/hooks/useOcrOsProcessor.ts` com fila assíncrona Mistral Vision (Pixtral / Mistral OCR) em lotes de 2 imagens, delay de 1500ms, extração da tabela de parcelas de pagamentos e retry
- [x] [FRONTEND] Criar os componentes `OcrBatchStoreCarryoverList.tsx`, `OcrBatchDropzoneAndPaste.tsx`, `OcrBatchProgressBar.tsx` e `OcrBatchReviewGrid.tsx` com visualização de parcelas
- [x] [FRONTEND] Criar o modal integrador `src/components/importacoes/OcrBatchOsModal.tsx` com tabs por filial, disparo de auto-matching pós-injeção e botão de injeção atômica
- [x] [FRONTEND] Modificar `CentralImportWizard.tsx` para detectar ausência de arquivos `.xls` de OS no Step 0 e disparar o fluxo de OCR
- [x] [TEST] Testar o fluxo completo com a API Key da Mistral colando o print real da OS `22593` de Mauá (Aba Pagamentos com 2 parcelas de débito) e validando auto-pareamento com a REDE e gravação em `patio_os`
- [x] [VERIFY] Executar `npm run build` garantindo zero erros de compilação
