# 📋 SDD Proposal — Cartões a Compensar, Saldo do Extrato e Saldo Consolidado por Filial

- **Spec ID:** `436-cartoes-compensar-e-saldo-consolidado-filiais`
- **Data:** 2026-09-22
- **Autor:** Antigravity 2.0 (Single-Agent Direto)
- **Status:** Proposta de Arquitetura

---

## 1. Problema Diagnosticado

Na data de 22/09/2026 (e no fechamento diário geral das 10 filiais), o modal **"Raio-X de Saldos Bancários & Dinheiro por Filial"** e o fechamento do dia estão duplicando valores no Saldo Consolidado de filiais como **Mauá (MHE)** e **Jorge Beretta (DHJV)**:

1. **Persistência de Status Incompleta em `pos_transactions`:**
   O motor `ReconciliadorRedeOFX` executa a conciliação em memória durante o wizard, mas o resultado não sincroniza adequadamente com as transações em `pos_transactions`. As 13 vendas de cartão do dia foram gravadas como `a_compensar` com `settled_amount = 0`, inclusive as vendas de débito que já entraram na conta bancária.

2. **Cálculo Cego do "A Compensar" na Camada de Leitura:**
   O hook `useBackendConciliacao.ts` e o modal `SaldoBancosDetailModal.tsx` calculam o valor de maquininhas somando indiscriminadamente todas as vendas com status diferente de `entrou`/`liquidado`. Como nenhuma venda de débito foi marcada como `entrou`, o valor integral do dia é somado de volta na coluna de Maquininhas.

3. **Falta de Lançamentos de Débito no Extrato OFX (Créditos já Absorvidos no Saldo Final):**
   Conferindo `previous_balance + lançamentos` contra o `bank_total` (saldo de encerramento do extrato):
   - **Mauá:** `-20.798,12 + 6.841,28 = -13.956,84`, mas o saldo gravado no OFX é `-12.964,64`. Sobra exatamente **+R$ 992,20**, que é o valor líquido do Débito VISA do dia 21 que caiu na conta.
   - **Beretta:** `52.731,18 + 5.533,92 - 10.540,16 = 47.724,94`, contra o saldo gravado no OFX de `48.111,02`. Sobram **+R$ 386,08**, absorvendo o Débito MASTERCARD de R$ 382,00.
   - Como o banco Itaú consolidou esses créditos diretamente no saldo final sem gerar uma linha avulsa `<STMTTRN>` em algumas contas, o matcher não encontrou a linha avulsa e deixou a venda como `a_compensar`.
   - Ao somar `Saldo do Extrato + Maquininhas`, o valor que já está embutido no saldo do extrato é somado uma segunda vez.

---

## 2. Solução Proposta

Aplicar a **Regra Contábil Canônica de Conciliação Fiduciária**:
$$\text{Saldo Consolidado} = \text{Saldo do Extrato (OFX)} + \text{Dinheiro no Cofre} + \text{Cartões que AINDA NÃO Caíram}$$

1. **Detecção de Liquidações Absorvidas no Saldo Bancário:**
   No motor e no pipeline de importação, confrontar a variação líquida do saldo bancário ($\Delta_{\text{saldo}} = \text{bank\_total} - \text{previous\_balance}$) contra a soma dos lançamentos do extrato ($\sum \text{extrato}$).
   Se $\Delta_{\text{saldo}} - \sum \text{extrato} > 0$, esse delta positivo representa liquidações/créditos consolidados pelo banco no saldo de fechamento que não possuem linha de extrato individual. O reconciliador vincula esse crédito absorvido às vendas de Débito/antecipações pendentes da filial, dando baixa (`entrou`) em vez de deixar como `a_compensar`.

2. **Gravação Bidirecional Atômica de `pos_transactions`:**
   Garantir que ao rodar o `ReconciliadorRedeOFX`, o pipeline atualize `pos_transactions`:
   - Vendas que tiveram crédito no extrato (ou no saldo absorvido): `settlement_status = 'entrou'`, `settled_date = target_date`, `settled_amount = net_amount`.
   - Vendas que permanecem a receber (D+1 / crédito a vencer): `settlement_status = 'a_compensar'`, `settled_amount = 0`.

3. **Cálculo Defensivo de `nao_entrou_valor` no Hook e no Modal:**
   No hook `useBackendConciliacao.ts` e no `SaldoBancosDetailModal.tsx`:
   - Apenas vendas com status estrito `a_compensar` e `settled_amount < net_amount` compõem a coluna de Maquininhas.
   - Para Mauá: Débito VISA R$ 992,20 entra como liquidado; apenas o Crédito MASTER R$ 3.679,12 fica como `a_compensar`.
     $$\text{Mauá}: -12.964,64 + 0 + 3.679,12 = -9.285,52 \quad \text{(Bate com o Gabarito Excel)}$$
   - Para Beretta: Débito MASTER R$ 382,00 entra como liquidado; R$ 0,00 fica como `a_compensar`.
     $$\text{Beretta}: 48.111,02 + 0 + 0 = 48.111,02 \quad \text{(Bate com o Gabarito Excel)}$$

---

## 3. Skills Especializadas Aplicadas

- `backend-patterns`: Server Actions tipadas, mutações seguras no Supabase, tratamento de ponto flutuante via `round2`.
- `database`: Rastreabilidade de chaves estrangeiras, consultas eficientes em `pos_transactions`, `reconciliations` e `daily_snapshots`.
- `frontend-design-pro`: Padrões de consistência visual no `SaldoBancosDetailModal`, garantindo que o status `CONCILIADO` / `A COMPENSAR` reflita exatamente a existência de resíduo fiduciário.

---

## 4. Contratos de Dados & Tabelas Envolvidas

- **`pos_transactions`**:
  - `settlement_status`: `'entrou'` (quando caiu no banco ou foi absorvido pelo saldo) ou `'a_compensar'` (quando a receber).
  - `settled_amount`: valor efetivamente recebido.
  - `settled_date`: data da liquidação bancária.
- **`reconciliations`**:
  - `bank_total`: saldo final oficial do extrato Itaú.
  - `previous_balance`: saldo anterior de abertura.
  - `machine_total`: total de cartões conciliados que entraram no dia.
- **`daily_snapshots`**:
  - `metadata.cartoes_a_compensar`: soma de todas as vendas das filiais com `settlement_status = 'a_compensar'`.
  - `metadata.total_saldo_banco_positivo`: soma dos saldos credores das filiais + dinheiro em cofre + cartões a compensar.

---

## 5. Arquivos Afetados

### [Arquivos Existentes Modificados]
1. `src/lib/matchers/reconciliadorRedeOfx.ts`: Suporte a detecção de créditos absorvidos no saldo final da conta bancária quando não há `STMTTRN` explícito.
2. `src/components/importacoes/CentralImportWizard.tsx`: Persistência atômica do `settlement_status` e `settled_amount` nas `pos_transactions` após a reconciliação.
3. `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`: Alinhamento do fechamento e snapshot com a gravação correta de cartões liquidados.
4. `src/hooks/useBackendConciliacao.ts`: Apuração rigorosa de `posUnsettledByStore` considerando estritamente vendas com `settlement_status = 'a_compensar'` e deduzindo liquidações absorvidas.
5. `src/components/conciliacao/SaldoBancosDetailModal.tsx`: Renderização do Saldo Consolidado por filial com a fórmula fechada.

---

## 6. Plano de Rollback

Caso haja qualquer inconsistência na apuração das outras 8 lojas:
1. `git restore` nos arquivos modificados.
2. O histórico do banco de dados permanece íntegro com a recarga das tabelas a partir do script de purga diária.
3. Não há criação de novas tabelas ou migrações destrutivas de schema DDL.

---

## 7. Risco Principal e Mitigação

- **Risco:** Uma loja ter débitos que realmente NÃO entraram na conta bancária (ex.: estorno ou retenção pela Rede) e o sistema assumir que entraram.
- **Mitigação:** A absorção pelo saldo só ocorre se a variação líquida do saldo ($\Delta_{\text{saldo}} - \sum \text{extrato}$) for positiva e suficiente para cobrir o valor da venda dentro da tolerância de taxa MDR (R$ 0,05 a 2%). Caso não haja saldo absorvido nem crédito no extrato, a venda permanece 100% como `a_compensar`.
