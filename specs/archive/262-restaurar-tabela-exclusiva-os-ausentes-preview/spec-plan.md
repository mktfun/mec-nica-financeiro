# Spec Plan: Restaurar Tabela Exclusiva de OSs Ausentes no Preview (262)

## Tasks

- [x] [FRONTEND] Remover a tabela genérica de todas as OSs importadas (`allImportedOsList`) no `CentralImportWizard.tsx`.
- [x] [FRONTEND] Reativar e aprimorar a detecção automática de OSs ativas no banco que não vieram na planilha (`detectMissingOs` / `missingOsList`) com busca case-insensitive e suporte multi-loja.
- [x] [FRONTEND] Renderizar a tabela interativa dedicada para `missingOsList` no Step 3 com inputs de Valor Total, Total Pago, Saldo Pendente calculado e seletor de Status.
- [x] [FRONTEND] Integrar a persistência das OSs ausentes editadas em `executeDailyClosing` atualizando `patio_os`.
- [x] [TEST] Executar `npm run build` para validar integridade do frontend.
- [x] [TEST] Validar que o Step 3 exibe unicamente as OSs ausentes do relatório sem poluição visual.

