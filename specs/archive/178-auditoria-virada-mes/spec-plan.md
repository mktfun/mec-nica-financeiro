# Spec Plan: Auditoria de Virada de Mês e OSs Órfãs (178)

## Tasks

- [x] [FRONTEND] Atualizar interface de `AuditoriaPassivoWizardProps` em `src/components/importacoes/AuditoriaPassivoWizard.tsx` para receber `cloudOsData: any[]`.
- [x] [FRONTEND] Refatorar `fetchPassivo()` no Wizard para buscar também em `patio_os` as OSs `em_aberto` e `pago_parcial`.
- [x] [FRONTEND] Implementar a lógica de filtragem cruzada (Cross-reference) comparando com `cloudOsData` para remover as OSs que já vieram no arquivo atual.
- [x] [FRONTEND] Reformular a UI de renderização das OSs (os inputs manuais): trocar os 3 botões simples por inputs de Status, Valor Pago e cálculo automático de Valor Restante.
- [x] [FRONTEND] Refatorar `handleConfirm()` para construir os payloads de UPDATE corretos dependendo se a OS veio da tabela `estoque_os_pendente` ou `patio_os`.
- [x] [FRONTEND] Garantir que o passo 2.5 (`CentralImportWizard.tsx`) injete corretamente a lista `cloudOsData` no componente `AuditoriaPassivoWizard`.
- [x] [TEST] Verificar se as OSs não presentes no arquivo são listadas e podem ser atualizadas.
