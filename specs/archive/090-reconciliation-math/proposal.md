# Proposal: Lógica Refatorada de Conciliação Bruto vs Líquido (090-reconciliation-math)

## Problema
A conciliação atual no Dashboard/Resumo do Dia calcula as pendências e o "Na loja OS" usando bases financeiras conflitantes, comparando dias incorretos (data de venda vs data de pagamento).
O modelo mental estava baseando OS com OFX (Bruto com Líquido), gerando uma falsa divergência (que na verdade é apenas o desconto das taxas da maquininha).
Além disso, comparava-se os dados no mesmo dia (D+0), quando na verdade pagamentos na maquininha têm prazo de recebimento (ex: D+1), aparecendo no OFX apenas no dia seguinte.

Isso causava:
1. Valores divergentes sempre acusando erro.
2. Inviabilidade de conciliação 1:1 exata sem aceitar um limite de divergência folgado.
3. Má precificação das vendas e confusão no fechamento.

## Solução Proposta
Adequar a arquitetura matemática para espelhar a transação real:
- **OS (Bruto)** → Cruza com **Relatório de Maquininha (Bruto)** (usando a data da Venda).
- **Relatório Maquininha (Líquido)** → Cruza com **OFX (Líquido)** (usando a data de Liquidação/Pagamento).
- O espaço entre Bruto e Líquido passa a ser tratado explicitamente como **Juros Descontados / Taxas**.
- PIX / SISPAG no OFX cruza com OS (Bruto) na data (geralmente não tem desconto de taxa sobre o valor final repassado de venda).
- TAR PIX no OFX = Despesa / Taxa (Custo, subtrai do Faturamento).

## Contratos de Dados
1. **Tabela `transactions`**
   - Adicionar `gross_amount` (numeric, default 0).
   - Adicionar `fee_amount` (numeric, default 0).
   - O campo `target_date` representará a data da **venda** no contexto da conciliação do fechamento, enquanto `occurred_at` (ou um novo campo de previsão de depósito) representaria a data de recebimento do OFX. Contudo, para simplificar o relacional, manteremos `target_date` = Data da Venda. O OFX cai em `target_date` do dia do pagamento bancário.

2. **Parser da Maquininha (`redeParser.ts`)**
   - Já possui extração de `grossAmount`, `netAmount` e `interest`. Precisamos apenas repassar pro DB no `CentralImportWizard.tsx`.

## API / Interface
- `CentralImportWizard.tsx`: Mudar o `txsToInsert` para incluir `gross_amount: item.grossAmount` e `fee_amount: item.interest`.
- `ResumoDiaPanel.tsx`:
  - Adicionar um campo na UI: **Juros Descontados**.
  - Comparar "Cartão Entrou" (OS Bruto) com "Rede Bruto" daquele dia.
  - O valor em "Na Loja OS" passa a ser: Vendas OS Crédito - Rede Bruto.
  - A diferença "Rede Bruto" - "Rede Líquido" vai para "Juros Descontados".

## Features Existentes Impactadas
- O cálculo do Painel Global em `modulo1Calculations.ts` será refatorado para absorver a diferença explícita de taxas.
- Visualização de conciliação diária.

## Risco Principal
- Fazer a junção assíncrona (Dias diferentes). O relatório de maquininha hoje é salvo na mesma `target_date` da importação (geralmente a data da venda). O OFX, importado amanhã, será gravado com `target_date` de amanhã. A conciliação de "Em Caminho" precisa olhar para o banco de dados e identificar o descasamento temporal. O maior risco é poluir a UI do dia D+0 tentando cruzar com OFX de D+1 e vice-versa. A UI precisa deixar explícito o que já entrou em banco, e o que está em maquininha pendente.
