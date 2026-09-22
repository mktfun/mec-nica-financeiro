# 📝 SDD Spec Plan — Correção Definitiva do Matcher Rede x OFX e Exibição de Saldos por Filial

- **Spec ID:** `435-fix-matcher-rede-ofx-saldos-filiais`
- **Data:** 2026-09-22
- **Autor:** Antigravity 2.0 (Single-Agent Direto)

---

## Tasks Atômicas de Implementação

### [ENGINE] Motor ReconciliadorRedeOFX
- [x] Task 1: Remover o Estágio 3 guloso em `src/lib/matchers/reconciliadorRedeOfx.ts` (eliminar absorção de vendas por créditos residuais antigos sem correspondência de valor/bandeira).
- [x] Task 2: Blindar o Estágio 2 de `src/lib/matchers/reconciliadorRedeOfx.ts` para garantir que apenas lotes de mesma bandeira e modalidade (Débito/Crédito) com tolerância MDR válida sejam casados.

### [PIPELINE] Central de Importações e Fechamento
- [x] Task 3: Remover a heurística de `remainingLedgerCredit` em `src/components/importacoes/CentralImportWizard.tsx` (linhas 2325-2345), atualizando `settlement_status` em `pos_transactions` estritamente pelo retorno determinístico (`conciliados` -> `entrou`, `naoEntrou` -> `a_compensar`).
- [x] Task 4: Remover a heurística de `remainingLedgerCredit` em `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` (linhas 341-360) para alinhar a pré-visualização de fechamento ao mesmo padrão determinístico.

### [UI / HOOKS] Exibição de Saldos e Consolidação Fiduciária
- [x] Task 5: Ajustar `src/hooks/useBackendConciliacao.ts` para que `posUnsettledByStore` considere estritamente transações com `settlement_status IN ('a_compensar', 'pendente')`, garantindo que filiais com vendas pendentes recebam o valor correto.
- [x] Task 6: Ajustar o modal `src/components/conciliacao/SaldoBancosDetailModal.tsx` para exibir o valor a compensar em *Maquininhas (Rede)* e calcular o *Saldo Consolidado* sem duplicar créditos que já integram o saldo bancário.

### [VERIFICATION] Terminal Gate e Validação
- [-] Task 7: [DISPENSADA PELO USUÁRIO] Validação pericial manual dispensada pelo usuário.
- [x] Task 8: Executar o Terminal Gate (`npm run build`) e garantir 0 erros de compilação TypeScript.
