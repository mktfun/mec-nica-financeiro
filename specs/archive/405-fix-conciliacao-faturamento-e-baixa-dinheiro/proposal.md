# Proposal: Correção do Faturamento com Despesas Indevidas, Idempotência do Cofre e Desduplicação do Dinheiro Manual (405)

## 1. Problema & Relatório Forense Aprofundado

O usuário reportou dois apontamentos cruciais sobre o fechamento de **16/09/2026**:

### 1.1. O Conflito do Dinheiro Manual vs. Cofre ("Dar Baixa era pro dinheiro sumir e não duplicar"):
- O usuário já havia preenchido e conferido manualmente o dinheiro real da empresa no campo **`Dinheiro MP` (R$ 19.526,00)**.
- Paralelamente, o sistema, ao importar a conferência de OSs do dia, gerou **R$ 23.578,50** em `store_cash_vault` (`status = 'em_transito'`).
- Na tela de fechamento (`ResumoDiaPanel.tsx`), o Caixa Atual calculou:
  $$\text{Caixa Atual} = \text{Saldo Bancos (com R\$ 23k de cofre)} + \text{Dinheiro MP Manual (R\$ 19.526)} + \dots$$
  **O dinheiro estava sendo contado DUAS VEZES no Caixa Atual!**
- Diante dessa duplicidade evidente, o usuário abriu o modal de baixa e deu baixa nos itens do cofre com o objetivo claro: **fazer aquele dinheiro em trânsito sumir da lista pendente para eliminar a duplicação com o valor manual**.
- **Por que a tela "nem mudou depois de dar baixa"?**
  Porque a RPC `dar_baixa_dinheiro` reduziu o cofre (-R$ 19.660) mas somou esse mesmo valor em `reconciliations.bank_total` (+R$ 19.660). No Card 1 (`derivedBankTotals`), o total positivo consolidado somou `Banco + Cofre`, mantendo a soma idêntica! E o Card 2 (`Dinheiro MP`) continuou somando os R$ 19.526,00 por cima!
  Ou seja: a duplicidade não foi desfeita, o dinheiro não sumiu do total de caixa (apenas migrou de coluna no Card 1) e o Caixa Atual e a Diferença Final continuaram rigorosamente iguais.
- E ao limpar o fechamento e reimportar o dia do zero, o motor de importação reprocessou o Excel de OSs e recriou todas as 15 entradas de dinheiro no cofre como `em_transito`.

### 1.2. A Distorção do Faturamento ("Não é só a justificativa que deveria alterar faturamento"):
- O usuário pontuou com total razão: justificar uma transação bancária não pode, de forma alguma, transformá-la automaticamente em faturamento da empresa.
- **O Erro Conceitual do Sistema:**
  No hook `src/hooks/useJustifiedTransactions.ts`, o sistema operava em lógica **opt-out**: qualquer transação de extrato OFX ou maquininha com categoria ou justificativa era somada em `totalGlobal` (Faturamento Extra), a menos que contivesse palavras de exclusão hardcoded (`[apenas conciliar]`, `tarifa`, `aporte`, etc.).
- Isso fez com que **14 saídas de Folha de Pagamento / Salários (SISPAG SALARIOS)**, somando **R$ 24.966,67**, fossem convertidas em positivo com `Math.abs()` e somadas ao Faturamento do Dia!
- **A Arquitetura Canônica de Faturamento:**
  1. A fonte oficial de faturamento mercantil/serviços é o **ERP Oficina Inteligente (Odômetro / Mapa de Metas)** (`faturamentoLiquidoDia = R$ 46.931,21`).
  2. Justificativas em extratos bancários e maquininhas são processos de conciliação de tesouraria/caixa e **NUNCA alteram Faturamento**.
  3. Apenas receitas não operacionais expressamente cadastradas em `daily_revenue_adjustments` ou flagged como receita extra avulsa podem somar ao Faturamento.

---

## 2. Solução Proposta

### 2.1. Desduplicação do Dinheiro em `ResumoDiaPanel.tsx` [MODIFY]
- **Regra de Coexistência entre Cofre e Dinheiro Manual:**
  Quando o usuário insere um valor manual em `dinheiroMpInput` / `dinheiro_mp` (ou quando a empresa opera com controle central de Dinheiro MP), o Card 1 não pode somar o `dinheiro_lojas` do cofre cumulativamente no `totalPositivoConsolidado` se isso duplicar com o Card 2.
- O Card 1 deve refletir estritamente o **Saldo Bancário Real (Extratos OFX)** + **Cartões a Compensar da Adquirente (Não Entrou)**.
- O dinheiro em espécie em posse da empresa fica consolidado no pilar de **Dinheiro Físico / MP**, eliminando a sobreposição de cofre no banco.

### 2.2. Baixa no Cofre como Liquidação de Custódia sem Dupla Inflação [MODIFY]
- A ação de "Dar Baixa" no `BaixaDinheiroModal.tsx` deve cumprir exatamente a expectativa do operador: **dar saída no dinheiro do cofre (status `'depositado'`) sem duplicar o saldo bancário** se o extrato bancário OFX daquele dia já foi importado (ou seja, se a conta bancária já possui seu saldo real fechado).
- Remover a atualização manual secundária de `reconciliations.bank_total` pelo cliente em `BaixaDinheiroModal.tsx`.

### 2.3. Blindagem de Faturamento Estritamente Opt-In em `useJustifiedTransactions.ts` [MODIFY]
- Inverter o paradigma de `checkImpactsRevenue`:
  - Débitos / saídas (`type === 'out'` ou `amount < 0`), salários, fornecedores, despesas operacionais e tarifas têm **impacto ZERO no faturamento**.
  - Justificativas comuns de extrato bancário servem para conciliação contábil de contas/caixa, e **NÃO somam no Faturamento**.
  - Apenas transações com crédito positivo (`amount > 0`) expressamente classificadas com a categoria `'Receita Extra'` ou tag `'[receita extra]'` podem somar ao Faturamento.
- Em 16/09/2026, os R$ 24.966,67 de salários são imediatamente expurgados do Faturamento, devolvendo o Faturamento do Dia para os oficiais **R$ 46.931,21** do Odômetro.

### 2.4. Idempotência em `useImportProcessor.ts` [MODIFY]
- Reimportações de OS não devem sobrescrever registros de cofre que já estejam com status `'depositado'`, prevenindo o retorno indiscriminado de dinheiro já baixado.

### 2.5. Blindagem de Dias Fechados em `useBackendConciliacao.ts` [MODIFY]
- Adicionar `is_closed` na seleção de `daily_snapshots`, impedindo recálculos dinâmicos em fechamentos históricos homologados.

---

## 3. Risco Principal e Mitigação
- **Risco:** Perder a rastreabilidade do dinheiro depositado no banco.
- **Mitigação:** O histórico de quem baixou, data de depósito e vínculo com a OS continuam sendo gravados integralmente em `store_cash_vault` e `patio_os.history_log`, garantindo auditoria completa sem gerar duplicações financeiras no dashboard.
