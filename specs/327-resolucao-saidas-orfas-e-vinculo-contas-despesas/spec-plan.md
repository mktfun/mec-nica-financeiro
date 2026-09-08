# SDD Spec-Plan: 327-resolucao-saidas-orfas-e-vinculo-contas-despesas

## Status: PROPOSAL COMPLETED (Awaiting `/apply 327`)

> [!IMPORTANT]
> Circuit Breaker `anti-auto-apply`: Nenhuma tarefa deste plano pode ser executada ou marcada como concluída antes da aprovação explícita do usuário com o comando `/apply 327` (ou `/vibe-apply 327`).

---

## Fases de Implementação

### Fase 1: Inteligência de Backend & RPC Supabase
- [ ] **Task 1.1:** Criar migration SQL aprimorando a RPC `auto_match_daily_transactions` com a **Fase 0 de Saídas**:
  - Auto-categorizar débitos bancários com padrões `SISPAG SALARIOS` / `FOLHA PAGTO` como `Folha de Pagamento / Salários` (`contabilizar_no_subtotal = true`).
  - Auto-categorizar `SAQUE DIN ATM` / `SAQUE LOT` como `Suprimento de Caixa / Saque Loja` (`contabilizar_no_subtotal = false`).
  - Auto-categorizar `PAGAMENTOS BRASICAR / HD / MHE` como `Transferência Intercompany` (`contabilizar_no_subtotal = false`).
  - Auto-categorizar `TARIFA` / `IOF` / `SEGURO` como `Tarifas & Encargos Bancários` (`contabilizar_no_subtotal = true`).
- [ ] **Task 1.2:** Aprimorar o algoritmo de matching de boletos na RPC para tolerar pequenas variações de data (+/- 2 dias) e fuzzy matching no nome do fornecedor (ex: `SUPRALIMP`, `ROYCE`, `NOVA DANIEL`, `MARCIO CASTRO`), vinculando diretamente ao `daily_manual_bills.id`.

### Fase 2: Persistência no Wizard de Importação
- [ ] **Task 2.1:** Modificar `CentralImportWizard.tsx` no Step 8 (gravação final no Supabase) para garantir que as transações de despesa casadas em memória por `executeExpenseAutoMatching` incluam o `matched_bill_id` e categoria contábil ao inserir/atualizar em `ofx_transactions`.
- [ ] **Task 2.2:** Atualizar o status das contas correspondentes em `daily_manual_bills` para `'paid'` durante o processo de gravação no wizard.

### Fase 3: Ações em Lote e UX no Frontend
- [ ] **Task 3.1:** Implementar a barra de ações em lote no topo de `Step2NonRevenueJustifications.tsx`:
  - Contador dinâmico de saídas pendentes de justificativa vs resolvidas.
  - Botão `[⚡ Auto-Justificar Operacionais]` para aplicar em massa as categorias padrão de salários, saques e tarifas com 1 clique.
  - Botão `[🔗 Confirmar Casamentos de Boletos]` para confirmar todos os vínculos sugeridos com `daily_manual_bills`.
- [ ] **Task 3.2:** Integrar a mesma barra de ações e controles no modal/visão `StoreExtratoBancarioView.tsx` para garantir consistência na conciliação diária da loja.
- [ ] **Task 3.3:** Adicionar seletor rápido com busca inteligente nos cards de despesas individuais para permitir ao operador vincular a conta da loja sem digitação manual.

### Fase 4: Validação, Visual QA & Build Gate
- [ ] **Task 4.1:** Executar teste de regressão ponta a ponta com a massa real de 19 saídas órfãs, validando que todas são resolvidas ou pré-categorizadas.
- [ ] **Task 4.2:** Validar a integridade matemática dos 5 pilares (`dif_saidas` e saldo de caixa), garantindo que saques e transferências intercompany não geram distorções.
- [ ] **Task 4.3:** Executar build completo (`npm run build` ou `npx tsc --noEmit`) para assegurar conformidade de tipagem e zero erros de console.
