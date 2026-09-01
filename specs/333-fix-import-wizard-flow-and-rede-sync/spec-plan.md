# Spec-Plan: Refatoração do Fluxo do Wizard e Sincronização da Rede (333)

- [x] **Step 1:** Modificar o fluxo de navegação de `CentralImportWizard.tsx`:
  - [x] Alterar o botão de avanço do Step 3 para navegar para o Step 4 (`setStep(4)`) em vez de chamar `handleConfirm()` / `setStep(8)`.
  - [x] Mudar o gatilho de gravação (`handleConfirm`) para ser acionado apenas ao finalizar o Step 7 (`Step4FinalAuditAndClose`).
  - [x] Coletar e consolidar os matches e edições manuais realizados nos Steps 4, 5 e 6 antes de disparar a gravação final.
- [x] **Step 2:** Corrigir a sincronização de `target_date` em `CentralImportWizard.tsx` e `useTransactions.ts`:
  - [x] Adicionar os nomes normalizados da Rede em `KNOWN_ACCOUNT_DEFAULTS` (`src/hooks/useStoreFileMappings.ts`).
  - [x] Forçar `target_date: targetDate` e passar `payment_method` e `transaction_type` para todas as vendas de maquininha em `txsToInsert` e `saveTransactions`.
  - [x] Corrigir seleção de colunas físicas de `pos_transactions` em `fetchRealUnmatchedTransactions`.
- [x] **Step 3:** Atualizar no banco de dados os 43 registros de maquininha gravados com `target_date = 2026-08-31` para `2026-09-01` e des-selar o snapshot de `2026-09-01` para cálculo dinâmico dos 5 pilares e 10 lojas.
- [x] **Step 4:** Testar o fluxo completo de ponta a ponta e validar no navegador `http://localhost:8080/`.
