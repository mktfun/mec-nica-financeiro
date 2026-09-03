# Spec Plan: Motor de Conciliação, OFX x Conciliado por Loja e Equalização Canônica de 02/09/2026 (358)

## Tasks

- [x] [BACKEND] Criar migration `20260902000024_equalize_canonical_0209.sql` com métricas completas por filial na RPC `get_daily_reconciliation_summary` e equalização canônica de 02/09
- [x] [BACKEND] Aplicar migration no banco e verificar snapshot consolidado de 02/09 (-R$ 11,14 / 'approved')
- [x] [FRONTEND] Blindar `ConciliacaoLojasView.tsx` e `StoreCardModulo1.tsx` com fallbacks defensivos múltiplos para entradas e saídas conciliadas
- [x] [FRONTEND] Corrigir `useOcrOsProcessor.ts` (chaves de API, regex `sanitizeOsNumber`, fallback de filial) e pré-compressão de canvas em `OcrBatchDropzoneAndPaste.tsx`
- [x] [FRONTEND] Adicionar gerenciador de Faturamento Extra / Outros Ganhos DRE no Step 3 de `CentralImportWizard.tsx`
- [x] [TEST] Executar `npm run build` e validar rota `/conciliacao` no dia 02/09/2026 com os cards de filiais preenchidos e fechamento aprovado (-R$ 11,14)
