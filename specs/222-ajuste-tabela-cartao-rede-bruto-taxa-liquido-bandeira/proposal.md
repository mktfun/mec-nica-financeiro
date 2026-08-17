# Proposal: Ajuste da Tabela de Cartão da Maquininha (Bruto, Taxa MDR, Líquido e Bandeira) (222)

## Problema
1. **Média Artificial na Coluna "Entrado no Banco / OS":**
   - No hook `useReconciliationViews` ([`useConciliacao.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useConciliacao.ts)), quando uma transação de cartão não tinha uma OS atrelada, o sistema dividia o total do depósito bancário da Rede pelo número de transações (`totalAdquirenteOfx / redeTxs.length = 2.907,025`), exibindo um valor decimal quebrado e completamente sem sentido.
   - Quando tinha uma OS atrelada, exibia o valor bruto da OS, fazendo parecer que o "líquido entrado" era idêntico ao bruto (sem refletir o desconto da taxa MDR).
2. **Falta de Clareza Visual sobre Bandeira e Modalidade:**
   - A tabela mostrava apenas o texto genérico "Importação Rede", ocultando a bandeira (Visa, Mastercard, Elo) e a modalidade/parcelamento da venda.

## Solução Proposta
1. **Correção no Hook `useReconciliationViews`:**
   - Remover a fórmula de divisão `totalAdquirenteOfx / count`.
   - Calcular individualmente para cada linha:
     - `rede_bruto`: Valor total da venda.
     - `taxa_brl`: Taxa MDR retida pela adquirente em R$.
     - `taxa_percent`: Percentual de taxa efetivo (`taxa_brl / rede_bruto * 100`).
     - `rede_liquido`: Valor líquido real creditado (`rede_bruto - taxa_brl`).
     - `bandeira` e `payment_method`: Bandeira do cartão e parcelas (ex: *Mastercard Crédito 3x*).
2. **Redesign da Tabela `OsVsRedeTable.tsx`:**
   - **Header / Cards de Resumo:**
     - Card 1: *Total Vendas Cartão (Bruto)*: `Soma(Bruto)`
     - Card 2: *Taxas MDR Retidas*: `Soma(Taxas)`
     - Card 3: *Total Líquido Creditado*: `Soma(Líquido)`
   - **Colunas Claras e Transparentes:**
     - Coluna 1: **Transação / Bandeira** (com badge e modalidade).
     - Coluna 2: **Valor Bruto (Venda)**.
     - Coluna 3: **Taxa MDR (R$ e %)**.
     - Coluna 4: **Valor Líquido (Creditado)**.
     - Coluna 5: **Referência / OS**.
     - Coluna 6: **Status**.
