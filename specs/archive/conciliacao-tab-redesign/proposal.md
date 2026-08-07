# Proposal: Redesign e Correção Lógica das Abas de Conciliação por Loja (conciliacao-tab-redesign)

## Problema
1. **Contradição entre Abas 2 e 3:** Na visualização da conciliação por loja, a Aba 2 (`Maquininha (Líq) → Banco`) declarava o depósito da adquirente (ex: `RECEBIMENTO REDE MAST... R$ 2.519,10`) como `PAREADO`, mas a Aba 3 (`Banco Sem Origem`) exibia o MESMO depósito de `R$ 2.519,10` como `NÃO IDENTIFICADO`.
2. **Delta Falso na Aba 1 (`Sistema OS → Maquininha`):** O sistema comparava o valor bruto da transação de cartão contra apenas a fração parcelada da OS, exibindo `DELTA R$ -845,90` mesmo quando o valor total da venda do pátio batia com a maquininha.
3. **Ausência de Conciliação Dedicada de PIX:** Lançamentos de PIX de OS (ex: `PIX: 385.00`) caíam no extrato bancário, mas não havia uma visualização limpa segregada para bater os PIXs do Pátio contra os PIXs do extrato OFX (baseado na estrutura da planilha `CONCILIAÇÃO 2307.xlsx`).

## Solução Proposta
1. **Segregação Lógica Perfeita e Eliminação de Falsos "Não Identificados" (Aba 4 / Exclusão):**
   - Transações bancárias OFX identificadas como depósito de adquirente (Rede/Redecard) que bateram na Aba 2 são **automaticamente excluídas** da Aba de Lançamentos Soltos.
   - A aba de "Banco Sem Origem" só exibirá lançamentos bancários que NENHUMA regra (Rede ou PIX de OS) conseguiu parear.
2. **Correção do Cálculo de Delta na Aba 1 (`OS Cartão vs Rede Bruto`):**
   - Comparar o valor bruto da transação da Rede (`rede_bruto`) contra a parcela de cartão da OS ou valor total da OS vinculada. Se o valor da OS bater com a transação da maquininha, exibir **`STATUS: PAREADO (R$ 0,00)`**.
3. **Nova Estrutura de 4 Abas Limpas na Conciliação por Loja (Inspirada no modelo `CONCILIAÇÃO 2307.xlsx`):**
   - **Aba 1: `Cartão (OS vs Rede)`:** Concilia vendas de cartão do Pátio com os lançamentos brutos da Rede.
   - **Aba 2: `Maquininha (Líq) → Banco`:** Concilia o total líquido da Rede contra o depósito de cartão do extrato OFX.
   - **Aba 3: `PIX (OS vs Banco OFX)`:** Concilia as OSs pagas via PIX/Transferência contra as entradas diretas de PIX no extrato bancário.
   - **Aba 4: `Banco (Extrato Não Identificado)`:** Exibe exclusivamente lançamentos do extrato que não possuem vínculo nem com a Rede nem com PIXs de OSs.

## Contratos de Dados
- Nenhuma alteração no schema do Supabase. Ajustes no hook `useConciliacao.ts` e componentes em `src/components/conciliacao/`.

## Features Existentes Impactadas
- `src/hooks/useConciliacao.ts` (`useReconciliationViews`)
- `src/routes/conciliacao._lojaId.tsx`
- `src/components/conciliacao/RedeVsOfxTable.tsx`
- `src/components/conciliacao/OsVsRedeTable.tsx`
- `src/components/conciliacao/UnmatchedOfxTable.tsx`

## Risco Principal
Garantir que os filtros de regex para adquirentes (`REDE`, `REDECARD`, `MAST`, `VISA`, `ELO`, `PAGAMENTO S.A.`) capturem 100% dos depósitos bancários de cartão sem deixar escapar registros para a aba de não identificados.
