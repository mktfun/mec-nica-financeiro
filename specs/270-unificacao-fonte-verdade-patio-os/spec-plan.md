# Spec Plan: Unificação da Fonte da Verdade do Pátio (NA LOJA OS) (Spec 270)

## Tasks

- [x] [BACKEND] Atualizar RPC `get_daily_reconciliation_summary` em migração SQL para consolidar `v_na_loja_os` e pátio por loja diretamente da tabela `patio_os` usando a regra canônica de saldo restante (`total_value - paid_value > 0` e não fechada)
- [x] [BACKEND] Sincronizar os registros de `reconciliations.na_loja_os` e `daily_snapshots.total_patio` para a data `2026-08-24` com o somatório real de `patio_os` (R$ 91.993,66)
- [x] [FRONTEND] Atualizar `PatioOsDetailModal.tsx` para sincronizar `daily_snapshots.total_patio` e `reconciliations` ao editar/excluir qualquer OS
- [x] [FRONTEND] Garantir que `CentralImportWizard.tsx` grave `patio_os`, `reconciliations` e `daily_snapshots` de forma 100% consistente no Step 4
- [x] [TEST] Validar compilação com `npm run build`
- [x] [TEST] Verificar na interface que o Card "NA LOJA OS" e o Modal "Ver OSs >" exibem exatamente o mesmo valor (R$ 91.993,66)
