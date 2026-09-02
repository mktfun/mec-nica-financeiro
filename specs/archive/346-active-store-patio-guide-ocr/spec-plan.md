# Spec Plan: Guia Ativo de Cobrança de Prints de OS por Loja (Feature 346)

## Tasks

- [x] [BACKEND] Criar migration `20260902000021_create_get_pending_patio_os_rpc.sql` com a RPC `get_pending_patio_os_for_ocr(p_target_date date)`
- [x] [BACKEND] Aplicar a migration no banco Supabase e validar retorno das 24 OSs pendentes das filiais
- [x] [FRONTEND] Reestruturar `src/components/importacoes/OcrBatchStoreCarryoverList.tsx` para o **Guia Ativo de Cobrança por Loja** com checklist interativo `[⚠️ Aguardando Print]` $\to$ `[✅ Print Capturado]`, contadores de progresso `(X capturadas, Y pendentes)`, botão de cópia formatada para WhatsApp e formulário de OS extra
- [x] [FRONTEND] Modificar `src/components/importacoes/OcrBatchOsModal.tsx` para consumir a RPC `get_pending_patio_os_for_ocr`, cruzar em tempo real os prints processados pelo Mistral OCR com as OSs pendentes e gerenciar o estado de OSs extras
- [x] [FRONTEND] Atualizar `src/components/importacoes/OcrBatchDropzoneAndPaste.tsx` e `OcrBatchReviewGrid.tsx` com tags de identificação de match de pátio vs novas OSs
- [x] [TEST] Testar no Playwright a renderização do Guia Ativo com as 24 OSs pendentes, botão de cópia para WhatsApp e auto-match com print
- [x] [VERIFY] Executar `npm run build` garantindo zero erros de compilação
