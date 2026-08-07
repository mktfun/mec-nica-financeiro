# Tasks (002-dashboard-rework)

- [x] **1. Hooks (Backend/Logic)**
  - [x] Em `src/hooks/useConciliacao.ts`, criar uma função interna auxiliar `calculateReconciliationStatus(financial, cash)` que retorne o `{ divergence, status }`.
  - [x] Criar a mutation `useSaveImportedReport`, que recebe `storeId, date, osTotal, financialTotal`. Ela deve ler a linha existente, atualizar os valores da planilha, rodar a função de cálculo e dar um `upsert`.
  - [x] Modificar `useSaveDailyCash` para que ela também leia a linha existente, atualize apenas o `daily_cash`, rode a função de cálculo e dê um `upsert`.

- [x] **2. Integração no Dialog**
  - [x] Em `src/components/dashboard/ImportReportDialog.tsx`, trocar o uso de `saveDailyCash` por `useSaveImportedReport`, passando os valores parseados `totalOs` e `totalPaid`.

- [x] **3. UI: Organização do Grid**
  - [x] Em `src/routes/conciliacao.tsx`, alterar o grid de lojas de `lg:grid-cols-5` para algo mais amplo como `lg:grid-cols-3 xl:grid-cols-4`.
  - [x] Ajustar as informações visuais no Card da loja para expor o "Faturado", o "Caixa" e o `status` atualizado de forma legível.

- [x] **4. Teste final**
  - [x] Simular inserção de "Dinheiro em Caixa" = 89138.60 e ver se o card da loja atualiza instantaneamente para OK.
