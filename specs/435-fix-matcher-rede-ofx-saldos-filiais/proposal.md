# 📋 SDD Proposal — Correção Definitiva do Matcher Rede x OFX e Exibição de Saldos por Filial

- **Spec ID:** `435-fix-matcher-rede-ofx-saldos-filiais`
- **Data:** 2026-09-22
- **Autor:** Antigravity 2.0 (Single-Agent Direto)

---

## 1. Problema Diagnosticado

1. **Desaparecimento do "A Compensar" das Maquininhas nas Filiais (virou `-`):**
   - Na importação do dia 22/09 às 16:43, filiais como **Jorge Beretta**, **Piraporinha** e **Jabaquara** tiveram o valor a compensar zerado (`R$ 0,00`), exibindo um traço (`-`) na coluna *Maquininhas (Rede)* do modal de saldos (*Raio-X de Saldos Bancários & Dinheiro por Filial*).
   - **Causa Raiz 1:** No arquivo `src/lib/matchers/reconciliadorRedeOfx.ts`, o **Estágio 3** (Lote Consolidado Loja) executa uma comparação gulosa: se a soma de qualquer crédito de adquirente remanescente no OFX for maior ou igual às vendas da loja (`totalRemainingCredit >= sumPending`), ele marca **100% das vendas do dia como conciliadas no banco (`statusMatch = true` / `settlement_status = 'entrou'`)**. Como os extratos OFX de Beretta, Piraporinha e Jabaquara tinham créditos residuais de lotes antigos (ex.: R$ 3.981,28 em Beretta), o motor absorveu indevidamente as vendas do dia 22/09.
   - **Causa Raiz 2:** Em `CentralImportWizard.tsx` e `Step4FinalAuditAndClose.tsx`, a variável `remainingLedgerCredit` forçava a liquidação (`settlement_status = 'entrou'`) de vendas restantes sem qualquer batimento de valor real.

2. **Persistência do Bug de Duplicação e Divergência de Saldo (Mauá e Jorge Beretta):**
   - **Mauá (MHE):** O saldo inicial do extrato OFX era `-R$ 12.964,64`. No extrato bancário oficial (e na planilha de fechamento `CONCILIAÇÃO 2209.xlsx`), entrou um crédito de adquirente de `R$ 3.679,12`, levando o saldo contábil para `-R$ 9.285,52`. Como o matcher não casou essa liquidação, manteve as vendas da Rede (`R$ 4.671,32`) 100% como a compensar e somou `-12.964,64 + 4.671,32 = -R$ 8.293,32`, gerando divergência de R$ 992,20.
   - **Jorge Beretta (DHJV):** O extrato OFX já exibe o saldo de `R$ 48.111,02`. Quando o sistema tratava a venda de `R$ 382,00` como pendente e somava sobre o saldo bancário, calculava `R$ 48.493,02`, duplicando a venda.

---

## 2. Solução Proposta

1. **Saneamento do Motor `ReconciliadorRedeOFX`:**
   - **Eliminação do Estágio 3 Guloso:** Remover a absorção cega por créditos residuais bancários (`totalRemainingCredit >= sumPending`).
   - O batimento passa a ser estritamente determinístico em 2 estágios:
     - **Estágio 1 (Match 1:1):** Mesma data/janela D+1, valor líquido exato (tolerância MDR R$ 0,05).
     - **Estágio 2 (Lote de Bandeira):** Agrupamento por bandeira e tipo (Débito com Débito D+1, Crédito com Crédito correspondente).
   - Vendas que não tiverem crédito correspondente legítimo permanecem como `statusMatch = false` e status `a_compensar`.

2. **Remoção de Canetadas de Saldo no Pipeline (`CentralImportWizard.tsx` e `Step4FinalAuditAndClose.tsx`):**
   - Eliminar a heurística de `remainingLedgerCredit`.
   - A atualização de `pos_transactions` deve respeitar com fidelidade de 100% o retorno do `ReconciliadorRedeOFX` (`conciliados` -> `entrou`; `naoEntrou` -> `a_compensar`).

3. **Consolidação Fiduciária na UI e Hooks (`SaldoBancosDetailModal.tsx` e `useBackendConciliacao.ts`):**
   - **Exibição Fiel de Maquininhas:** A coluna *Maquininhas (Rede)* exibe rigorosamente a soma das vendas com `settlement_status = 'a_compensar'` da loja. Nunca exibir traço (`-`) se houver vendas pendentes de liquidação.
   - **Blindagem Contra Duplicação no Saldo Consolidado:** 
     - Vendas que já caíram no extrato bancário (`settlement_status = 'entrou'`) **já integram** o saldo bancário do OFX e não podem ser somadas novamente.
     - Vendas pendentes (`settlement_status = 'a_compensar'`) são somadas como ativo em trânsito ao saldo consolidado da filial.

---

## 3. Skills Especializadas Aplicadas
- `frontend-design-pro`: Tokens Zinc-950, formatação fiduciária tabular e feedback visual.
- `backend-patterns`: Validação tipada, matching idempotente e atomicidade no Supabase.
- `database`: Manutenção da consistência de estados em `pos_transactions` (`entrou` vs `a_compensar`).

---

## 4. Contratos de Dados
- **`pos_transactions`**:
  - `settlement_status`: `'entrou'` | `'a_compensar'` | `'liquidado'`
  - `settled_date`: Data da liquidação bancária.
- **`StoreReconciliationSummary`** / **`StorePosDetail`**:
  - `nao_entrou_valor`: Soma das vendas da loja com status `a_compensar`.
  - `saldo_banco_ofx`: Saldo extraído do extrato OFX.

---

## 5. Arquivos Afetados

### [Arquivos Existentes Modificados]
- `src/lib/matchers/reconciliadorRedeOfx.ts`: Remoção do Estágio 3 guloso e blindagem do Estágio 2 por modalidade/bandeira.
- `src/components/importacoes/CentralImportWizard.tsx`: Eliminação de `remainingLedgerCredit` e persistência atômica dos status conciliados vs a compensar.
- `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`: Eliminação de `remainingLedgerCredit` na pré-visualização de fechamento.
- `src/components/conciliacao/SaldoBancosDetailModal.tsx`: Exibição das maquininhas a compensar sem sumir com `-` e cálculo à prova de duplicações.
- `src/hooks/useBackendConciliacao.ts`: Ajuste de query e consolidação de `posUnsettledByStore` para status `a_compensar`.

### [Arquivos Novos]
- *Nenhum* (reutilização estrita dos componentes legados).

---

## 6. Plano de Rollback
- Reversão atômica via `git checkout` dos arquivos alterados caso ocorra qualquer falha no build ou validação contábil.
- Reprocessamento limpo do lote de importação pela interface em caso de necessidade de recálculo dos status das transações.

---

## 7. Risco Principal e Mitigação
- **Risco:** Uma venda legítima não ser conciliada no banco caso a adquirente faça aglutinação atípica com MDR diferenciado.
- **Mitigação:** Preservação da tolerância dinâmica de MDR no Estágio 2 e exibição de alerta transparente no resumo da conciliação.
