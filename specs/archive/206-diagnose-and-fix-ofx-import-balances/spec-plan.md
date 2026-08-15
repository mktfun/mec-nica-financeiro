# Spec Plan: 206-diagnose-and-fix-ofx-import-balances

## Tasks

- [x] [PARSER] Em `src/lib/parsers/ofxParser.ts`, expandir a regex de captura de saldo anterior para cobrir variantes bancárias (`SLD ANTERIOR`, `SDO ANTERIOR`, `SALDO INICIAL`, `SALDO DEVEDOR`, etc.) e tags `<PRVBAL>`.
- [x] [PARSER] Em `src/lib/parsers/ofxParser.ts`, preservar o sinal de saldos anteriores negativos e aprimorar a triangulação matemática com checksum contábil.
- [x] [FRONTEND] Em `src/hooks/useStoreFileMappings.ts`, adicionar auto-mapeamento nativo para números de conta do Itaú e aliases conhecidos.
- [x] [FRONTEND] Em `src/components/importacoes/CentralImportWizard.tsx`, corrigir a acumulação de `storeBankBalances` para somar saldos quando uma loja tiver múltiplas contas OFX.
- [x] [FRONTEND] Em `src/components/importacoes/CentralImportWizard.tsx`, implementar a Tabela de Auditoria e Diagnóstico de Saldos OFX com visualização por loja, movimentação (In/Out) e soma consolidada.
- [x] [BACKEND] Em `src/hooks/useTransactions.ts`, proteger o salvamento de `reconciliations` contra entradas com `store_id` nulo ou duplicado.
- [x] [TEST] Executar simulação de build (`cmd.exe /c "npm run build"`) para validar tipagem TypeScript e empacotamento Nitro/Vite.
