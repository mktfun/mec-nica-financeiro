# Spec Plan: Alinhamento de Carryover do Pátio no Wizard vs Planilha Excel 24/08 (Spec 277)

## Tasks

- [ ] [FRONTEND] Atualizar `src/components/importacoes/MissingPatioOsEditor.tsx`:
  - Renomear título para *"Veículos em Serviço no Pátio (Carryover de Dias Anteriores)"*
  - Trocar o estilo de alerta agressivo de perigo para um card informativo com badge azul/verde
  - Definir que o comportamento padrão preserva todas as OSs em aberto no pátio (`status = original_status`)
  - Destacar o botão *"Manter Todas no Pátio"* como ação recomendada
- [ ] [FRONTEND] Atualizar `src/components/importacoes/CentralImportWizard.tsx`:
  - Garantir que o cálculo de `computedTotalPatioEstoque` compute com precisão o carryover das OSs em aberto
- [ ] [BACKEND/DB] Garantir que a OS #2326 (Santo André, R$ 9.218,73 em aberto), OS #18412, OS #8659 e OS #8689 estejam com seus saldos canônicos intactos em `patio_os` para 24/08
- [ ] [TEST] Executar auditoria via script e `npm run build` confirmando que Pátio total bate R$ 88.212,39
