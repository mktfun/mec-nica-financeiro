# Spec Plan: Motor de Cálculo Direto das Fontes Brutas e Desduplicação de Contas (Spec 278)

## Tasks

- [x] [FRONTEND] Corrigir parser de OS em `src/hooks/useOsImportProcessor.ts`:
  - Priorizar `r$ total da os` para `totalValue` e ignorar `total no financeiro`
  - Mapear `restante na os` para capturar saldo em aberto de OSs em andamento
- [x] [FRONTEND] Ajustar `MissingPatioOsEditor.tsx`:
  - Definir preservação automática no pátio para OSs de dias anteriores
- [x] [BACKEND] Criar migração SQL `20260824000008_fix_contas_duplication_and_file_sources_reconciliation.sql`:
  - Atualizar RPC `get_daily_reconciliation_summary` para usar `SUM(amount)` de `daily_manual_bills` sem duplicar com `snapshot.contas_a_pagar`
- [x] [BACKEND] Aplicar a migração no Supabase
- [x] [TEST] Executar `npm run build` e validar compilação sem erros
