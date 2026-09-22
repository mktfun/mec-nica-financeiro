# Spec Plan — Etapa 7: Estruturação de OS & Blindagem do Pátio

### [DATABASE]
- [x] Criar migration `supabase/migrations/20260917000003_structure_os_payments_and_patio_ssot.sql` ajustando a query da RPC `get_daily_reconciliation_summary` para capturar os status reais `em_aberto` e `pago_parcial` de `patio_os`, blindando o valor de R$ 74.433,57
- [x] Adicionar colunas estruturadas de pagamento em `patio_os` para receber valores decompostos

### [FRONTEND/IMPORT]
- [x] Atualizar `src/hooks/useOsImportProcessor.ts` para persistir as formas de pagamento nas novas colunas e preservar status de pátio
- [x] Blindar `src/components/importacoes/CentralImportWizard.tsx` para não zerar `veiculosPatioValor` quando a planilha importada só tiver OSs faturadas

### [QUALITY GATE]
- [x] Executar `npm run build` garantindo zero erros de compilação
