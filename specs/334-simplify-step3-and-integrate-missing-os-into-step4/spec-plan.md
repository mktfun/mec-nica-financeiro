# Spec-Plan: Simplificação do Step 3 e Integração de OSs Ausentes no Step 4 (334)

- [x] **Step 1:** Atualizar `Step1UnregisteredPayments.tsx` (Step 4) para suportar sub-abas:
  - [x] Adicionar estado `activeSubTab` ('unmatched' | 'patio').
  - [x] Receber `missingOsList`, `onChangeMissingOsList` e `isSaving` via props e renderizar `MissingPatioOsEditor` na sub-aba de OSs.
- [x] **Step 2:** Limpar e simplificar o Step 3 em `CentralImportWizard.tsx`:
  - [x] Remover tabelas de previsão multi-loja, `DiagnosticPanel`, `MissingPatioOsEditor` do Step 3 e o Inspetor JSON.
  - [x] Manter apenas os 3 KPIs, a Data Base, os 4 cards de Inputs Manuais Globais e os botões de ação.
  - [x] Repassar `missingOsList` e `setMissingOsList` para o `<Step1UnregisteredPayments />` no Step 4.
  - [x] Corrigir a guarda `detectMissingOs` para disparar no step 3 **e** no step 4.
- [x] **Step 3:** Validar compilação (`npm run build`) — saiu com código 0. ✅
