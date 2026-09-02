# Spec Plan: Simplificação e Foco do Step 3 do Wizard de Importação nos Inputs Manuais (337)

## Tasks

- [x] [FRONTEND] Remover do JSX do `step === 3` em `CentralImportWizard.tsx` os blocos de `<MissingPatioOsEditor />`, `<DiagnosticPanel />`, Previsão de Filiais (`stores.map`) e banner de contas analíticas
- [x] [FRONTEND] Realizar faxina de imports órfãos em `CentralImportWizard.tsx`
- [x] [FRONTEND] Preservar 100% dos estados dos 4 inputs manuais (`odometroHoje`, `manualDinheiroMp`, `manualAReceber`, `contasManual`), Data Base, Inspetor JSON e botões de navegação
- [x] [TEST] Executar build gate (`npm run build`) e garantir 0 erros de compilação TypeScript
- [x] [TEST] Validar visualmente o Step 3 no navegador em `http://localhost:8080/importacoes`
