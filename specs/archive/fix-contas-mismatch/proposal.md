# Fix Contas Manual Mismatch Proposal

## 1. Contexto e Problema
O usuário reportou que após realizar a baixa manual em dinheiro ("PAGAMENTOS DANIEL ANTONELI - R$ 10.000,00"), o total de **Contas (Manual)** exibido no painel do Dashboard ficou divergente do total exibido dentro do Modal de Contas.
- **Dashboard:** Exibia `R$ 22.112,91`
- **Modal:** Exibia `R$ 32.112,91`
Isso criava uma falsa diferença de `R$ -5.285,74` (ou positiva dependendo da perspectiva), gerando extrema frustração e invalidando a auditoria.

## 2. Diagnóstico Root Cause (Bayesian Reasoning)
A investigação revelou que a discrepância matemática residia em duas pontas incompatíveis:
1. **O Frontend (Modal):** Calculava o total corretamente somando todas as contas onde `status !== 'ignored'`.
2. **O Backend (RPC `get_daily_reconciliation_summary`):** Excluía contas onde o `match_status` era `'paid_cash'` ou `'linked'`. 

**Por que a RPC estava matematicamente errada?**
Quando uma conta é paga em dinheiro (`paid_cash`), o saldo do Cofre cai. Consequentemente, o **Caixa Atual** e o **Fluxo de Caixa** caem. 
O Dashboard calcula o `Valor Disp. Contas` como `Faturamento - Fluxo de Caixa`. Se o Fluxo de Caixa caiu R$ 10k, o `Valor Disp. Contas` **sobe** R$ 10k. 
Se não incluirmos a conta paga no **Subtotal de Contas**, teremos um "dinheiro disponível" de +10k que não é abatido por nenhuma despesa. Portanto, contas pagas **DEVEM** ser incluídas no somatório das despesas (Contas Manual) para balancear a matemática perfeita do DRE.

## 3. Solução Proposta
Como não podemos empurrar uma migration SQL (`supabase db push`) de forma limpa em ambiente headless sem credenciais de password root, propomos uma **sobreposição tática de front-end no Hook Central (`useBackendConciliacao`)**:
1. Buscar ativamente a tabela `daily_manual_bills` onde `status != 'ignored'` no Hook.
2. Calcular o `totalManualBills` dinamicamente com base nesta query.
3. Substituir o valor defasado `raw.contas_manual` (vindo da RPC) pelo novo valor calculado.
4. Isso propaga o valor correto de `R$ 32.112,91` para todos os fluxos downstream do dashboard e painel de fechamento, restaurando o SSOT.
