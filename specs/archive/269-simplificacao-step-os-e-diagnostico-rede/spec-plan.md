# Spec Plan: Simplificação do Card de OSs Ausentes no Wizard e Diagnóstico de Juros/Compensação Rede (269)

## Tasks

- [x] [FRONTEND] Remover a tabela secundária duplicada de todas as OSs em `src/components/importacoes/CentralImportWizard.tsx`, mantendo apenas o card único do `<MissingPatioOsEditor />`
- [x] [FRONTEND] Limpar estados locais e variáveis não utilizadas (`osSearchQuery`, `osStoreFilter`, `osStatusFilter`, `osTabFilter`, `osPage`, `osCounts`, etc.) em `CentralImportWizard.tsx`
- [x] [TEST] Validar compilação do frontend com `npm run build`
- [x] [TEST] Verificar renderização limpa e funcionalidade do Step 3 no Wizard de Importação
