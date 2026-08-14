# Plano de Execução: Spec 203

## Tasks

- [x] [FRONTEND/PARSER] Atualizar `src/lib/parsers/marcoZeroParser.ts` utilizando `arrayBuffer()`, normalização robusta e logs de depuração no console.
- [x] [FRONTEND/WIZARD] Atualizar `src/components/importacoes/CentralImportWizard.tsx` integrando `useStoreFileMappings`, sanitizações estritas de banco (`type: in/out`, `target_date`, `Math.abs`) e Inspetor JSON de conciliação no Step 3.
- [x] [FRONTEND/MARCO_ZERO] Atualizar `src/components/importacoes/MarcoZeroWizard.tsx` com logs de depuração do payload da RPC `process_marco_zero_import`.
- [x] [FRONTEND/ROUTES] Atualizar `src/routes/importacoes.tsx` para renderizar `CentralImportWizard` na Aba 1 e `MarcoZeroWizard` na Aba 2.
- [x] [FRONTEND/CLEANUP] Remover `src/components/importacoes/DailyImportView.tsx`.
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo compilação TypeScript limpa e bundling 100% verde.
- [x] [TEST] Testar o fluxo completo nas abas de Fechamento Diário e Marco Zero.
