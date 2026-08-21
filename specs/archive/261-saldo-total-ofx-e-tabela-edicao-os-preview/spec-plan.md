# Spec Plan: Saldo Total OFX e Tabela de Edição de OSs no Preview (261)

## Tasks

- [x] [FRONTEND] Atualizar nomenclatura do card de extratos para "Saldo Total Bancário (OFX)" com a soma total do período em `CentralImportWizard.tsx`.
- [x] [FRONTEND] Implementar a função `updateImportedOs` no `CentralImportWizard.tsx` permitindo editar `total_value`, `paid_value` e `status` nas OSs de `results.osFiles`.
- [x] [FRONTEND] Criar a tabela interativa, pesquisável e filtrável de Ordens de Serviço Importadas no Step 3 do `CentralImportWizard.tsx` com inputs editáveis de Valor Total e Valor Pago.
- [x] [FRONTEND] Garantir que `executeDailyClosing` salve as OSs com os valores editados pelo usuário em `patio_os`, `reconciliations` e `daily_snapshots`.
- [x] [TEST] Executar `npm run build` para validar integridade de tipos TypeScript e build do frontend.
- [x] [TEST] Verificar funcionamento dos inputs de Valor Total e Valor Pago e recálculo reativo dos cards.
