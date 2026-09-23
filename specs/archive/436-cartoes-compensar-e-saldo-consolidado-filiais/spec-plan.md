# 📝 SDD Spec Plan — Cartões a Compensar, Saldo do Extrato e Saldo Consolidado por Filial

- **Spec ID:** `436-cartoes-compensar-e-saldo-consolidado-filiais`
- **Data:** 2026-09-22
- **Autor:** Antigravity 2.0 (Single-Agent Direto)

---

## Tasks Atômicas de Implementação

### [ENGINE] Motor ReconciliadorRedeOFX
- [x] Task 1: Incorporar no `ReconciliadorRedeOFX.ts` a detecção de créditos de adquirente absorvidos na variação de saldo bancário (`bankTotal - previousBalance - sumExtrato`), permitindo a conciliação de vendas cujo crédito foi consolidado diretamente no saldo do Itaú sem linha de extrato individual.
- [x] Task 2: Parametrizar o `ReconciliadorRedeOFX` para aceitar `previousBalance` e `bankTotal` por filial ao instanciar o conciliador.

### [PIPELINE] Central de Importações e Wizard
- [x] Task 3: No `CentralImportWizard.tsx`, passar `previousBalance` e `bankTotal` ao instanciar o `ReconciliadorRedeOFX` para cada loja.
- [x] Task 4: No `CentralImportWizard.tsx`, persistir atômica e explicitamente `settlement_status = 'entrou'` e `settled_amount = net_amount` em `pos_transactions` para as vendas conciliadas (seja por linha do OFX ou por crédito absorvido).
- [x] Task 5: No `Step4FinalAuditAndClose.tsx`, alinhar o fechamento diário e a gravação de `daily_snapshots.metadata.cartoes_a_compensar` para refletir estritamente a soma das vendas com status `a_compensar`.

### [UI / HOOKS] Apuração de Saldos e Modal
- [x] Task 6: No `useBackendConciliacao.ts`, consolidar `posUnsettledByStore` estritamente com base nas vendas que continuam pendentes (`settlement_status = 'a_compensar'`), garantindo que vendas de débito absorvidas não reapareçam como maquininhas a compensar.
- [x] Task 7: No `SaldoBancosDetailModal.tsx`, assegurar que a coluna de Maquininhas exiba o valor de cartões a compensar e que o Saldo Consolidado feche exatamente na fórmula: `Saldo OFX + Dinheiro no Cofre + Maquininhas a Compensar`.

### [VERIFICATION] Terminal Gate e Validação
- [x] Task 8: Executar o Terminal Gate (`npm run build`) e garantir 0 erros de compilação TypeScript.
- [x] Task 9: Validar as fórmulas com os dados do dia 22/09 no Supabase (Mauá fechando em `-R$ 9.285,52` com `R$ 3.679,12` a compensar, e Beretta fechando em `R$ 48.111,02` com `R$ 0,00` a compensar).
