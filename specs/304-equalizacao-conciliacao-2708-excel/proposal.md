# Proposal: Equalizacao da Conciliacao com a Planilha Oficial (CONCILIACAO 2708.xlsx) (304)

## Problema
O sistema estava apresentando valores divergentes da planilha oficial de fechamento diario do operador (`CONCILIACAO 2708.xlsx`):
1. **Card "Saldo Bancos + Dinheiro":** O sistema calculava `R$ 91.617,38` (adicionando Cofre `R$ 1.770,00` e Rede a Compensar `R$ 7.231,41`), enquanto na planilha oficial a celula `G13` (SALDO) e estritamente a soma dos 8 OFXs positivos = **`R$ 82.615,97`**.
2. **Caixa Atual:** Na planilha celula `G21`, a formula e `G17 (Ativos) - G18 (Cheque Especial)` = `(82.615,97 + 20.225,00 + 8.349,67 + 65.603,74) - 22.040,20` = **`R$ 154.754,18`** (o sistema estava exibindo `R$ 163.755,56`).
3. **Fluxo de Caixa:** `G23 = G21 (154.754,18) - G22 (151.642,60)` = **`+R$ 3.111,58`**.
4. **Faturamento do Dia:** `G26 = G43 (891.663,62) - G44 (867.799,24)` = **`R$ 23.864,38`**.
5. **Valor Disp. Contas:** `G29 = G27 (23.864,38) - G28 (3.111,58)` = **`R$ 20.752,80`**.
6. **Contas a Pagar Totais:** `G30 = 9.535,72 (Contas/Boletos/Seguro) + 10.000,00 (Prolabore Daniel) + 1.217,11 (Juros Rede)` = **`R$ 20.752,83`**.
7. **Diferenca Final:** `G31 = G29 (20.752,80) - G30 (20.752,83)` = **`-R$ 0,03`** (Aprovado / Diferenca zero!).

## Solucao Proposta
1. **Ajuste da Composicao do Card Saldo Bancos e RPC:**
   - O Card principal de Bancos passa a exibir o total de **OFX Positivo (`R$ 82.615,97`)**, com o pill vermelho de Cheque Especial `(-) R$ 22.040,20` e pills informativos opcionais.
   - O Caixa Atual calcula com base na formula exata do Excel: `OFX Positivo (82.615,97) + Dinheiro MP (20.225,00) + A Receber (8.349,67) + Na Loja OS (65.603,74) - Cheque Especial (22.040,20) = R$ 154.754,18`.
2. **Contas a Pagar:**
   - Adicionar o lançamento de Prolabore Daniel (`R$ 10.000,00`) e Seguro Planalto (`R$ 284,49`) em `daily_manual_bills` para totalizar `R$ 19.535,72` em contas manuais + `R$ 1.217,11` em juros da Rede = `R$ 20.752,83`.
3. **Faturamento Anterior e do Dia:**
   - Faturamento anterior registrado como `R$ 867.799,24` para que o Faturamento do Dia resulte exatamente em `R$ 23.864,38`.
4. **Snapshot e Backend:**
   - Atualizar o snapshot de 27/08 com todos os valores oficiais da planilha `CONCILIACAO 2708.xlsx`.
