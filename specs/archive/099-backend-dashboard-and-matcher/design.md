# Design Document: Backend Dashboard & Matcher (Spec 099)

## 1. get_dashboard_metrics (A Matemática Inviolável)
A RPC precisa ser recodificada para emitir exatamente os 10 atributos de output solicitados para cada iteração ou macro.

**Cálculos Estruturais:**
```sql
v_saldo_total := SUM(reconciliations.bank_total);
v_dinheiro_mp := daily_snapshots.dinheiro_mp;
v_a_receber := daily_snapshots.a_receber_manual + (Soma boletos? Receivables?);
v_na_loja := SUM(patio_os.total_value - patio_os.paid_value);
v_caixa_atual := (v_saldo_total + v_dinheiro_mp + v_a_receber + v_na_loja) - daily_snapshots.saldo_negativo_itau;

v_fluxo_cx := v_caixa_atual - v_caixa_anterior;
v_fatura := (v_faturamento_atual - v_faturamento_anterior) + daily_snapshots.faturamento_outros_valor;

v_valor_disp_contas := v_fatura + v_fluxo_cx;
v_valor_contas := daily_snapshots.juros_rede + SUM(transactions.type = 'out' AND source = 'ofx');
v_diferenca := v_valor_disp_contas - v_valor_contas;
```

## 2. auto_match_transactions()
RPC automatizada que será acionada (ou agendada/disparada via API) após a importação.

**Fluxo Lógico:**
1. Isolar transações OFX do tipo entrada (`type = 'in'`) para um dia.
2. Varrer transações REDE e PATIO_OS.
3. Se `ABS(ofx.amount - rede.amount) < 0.1` -> Marca ambas como pareadas (adicionando um ID de relacionamento ou setando `status = 'MATCHED'`).
4. Para agrupamentos (1 OFX = múltiplas transações REDE), um cursor somará as transações da Rede até chegar no valor do OFX, unindo-as caso bata na tolerância.

**Mudanças de Schema:**
Será necessário garantir que a tabela `transactions` comporte um `match_id` ou `matched_ofx_id` caso não exista, e um `status` ('pending', 'matched').

## 3. Frontend Hooks e Tables
`useDashboardV2.ts` será completamente higienizado. O objeto retornado pela RPC já será a estrutura exata do estado do componente.
`RedeVsOfxTable.tsx` e `PixVsOfxTable.tsx` não farão mais `some()`, `reduce()` e buscas no array. Renderizarão apenas listas pré-agrupadas baseadas no `matched_ofx_id` fornecido pela tabela `transactions`.
