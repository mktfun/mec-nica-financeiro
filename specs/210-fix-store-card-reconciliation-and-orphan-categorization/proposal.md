# Proposal: 210-fix-store-card-reconciliation-and-orphan-categorization

## 1. Problema Identificado

1. **Atribuição Indevida do Faturamento Total do Pátio na Linha de Maquininha (Aba 1: Cartão OS → Maquininha)**:
   - Em `useReconciliationViews`, a linha de importação da REDE atribuiu o faturamento total acumulado de todas as OSs abertas do pátio (`R$ 29.134,70`) a uma única transação de maquininha (`R$ 5.054,52`), gerando um falso Delta astronômico de `R$ -24.080,18`.
   - Além disso, exibiu um UUID de batch bruto como número de OS (`OS #1718586b-b74f-42b8-ace5-de774af34c4c`) em vez de referenciar a operação real de maquininha ou o extrato consolidado.
   - O faturamento a ser comparado com as vendas de maquininha da loja deve ser **estritamente o faturamento de cartão daquela filial que entrou no OFX** (ex: `DOC/TED ELET REDE MULTI MAST`, `DOC/TED ELET REDE MULTI VISA`, etc.) ou a OS específica quando houver pareamento 1:1.

2. **Erro PostgreSQL "55000: cannot update view 'transactions'" ao Justificar Transação Órfã**:
   - A entidade `transactions` no Supabase é uma `VIEW` que faz `UNION ALL` sobre `ofx_transactions`, `pos_transactions` e `manual_transactions`.
   - Quando o hook `useCategorizeOrphan` tentava atualizar `supabase.from('transactions').update(...)`, o banco bloqueava com erro 55000 porque views com `UNION` não são diretamente atualizáveis.
   - A atualização de categoria e justificativa deve atingir diretamente a tabela base de origem (`ofx_transactions` ou `pos_transactions`).

---

## 2. Solução Proposta

1. **Reestruturação do Cruzamento de Cartão por Loja (`src/hooks/useConciliacao.ts` e `OsVsRedeTable.tsx`)**:
   - Separar claramente as transações de maquininha por lote/bandeira (ex: `REDE MAST`, `REDE VISA`, etc.).
   - O `Faturamento Sistema (Entrou no OFX / Banco)` de cada linha deve ser o valor creditado daquela adquirente no extrato bancário OFX da loja (ex: `R$ 4.911,48` líquido / `R$ 5.054,52` bruto).
   - Somente associar a uma OS de `patio_os` quando houver um número de OS real e valor correspondente. Se o identificador for um hash/UUID de importação, formatar amigavelmente como `Consolidado Loja (Extrato REDE)` ou o nome da bandeira.
   - Cards de Resumo no topo da Aba 1:
     - **Total Cartão (Rede Bruto)**: `R$ 5.054,52` (soma bruta das maquininhas da loja)
     - **Faturamento Maquininha (Entrou no OFX / Banco)**: `R$ 4.911,48` (líquido) ou `R$ 5.054,52` (bruto)
     - **Diferença (Taxa Retida / Delta)**: `R$ 143,04` (taxa MDR retida) ou `R$ 0,00` quando confrontado pelo valor líquido.

2. **Correção Direta nas Tabelas Base para Justificativa de Órfãos (`useCategorizeOrphan.ts`)**:
   - Em `useCategorizeOrphan`, atualizar diretamente a tabela base `ofx_transactions`:
     ```ts
     const { data, error } = await supabase
       .from('ofx_transactions')
       .update({
         manual_category: category,
         manual_justification: justification
       })
       .eq('id', transactionId)
       .select();
     ```
   - Se a transação for de maquininha, atualizar `pos_transactions`.
   - Elimina 100% o erro `55000: cannot update view "transactions"`.

---

## 3. Contratos de Dados

- **Tabela `ofx_transactions`**:
  - `manual_category` (`text`)
  - `manual_justification` (`text`)
- **Tabela `pos_transactions`**:
  - `manual_category` (`text`)
  - `manual_justification` (`text`)
- **Tabela `daily_snapshots`**:
  - `faturamento_outros_valor` (`numeric`)
  - `faturamento_outros_desc` (`text`)

---

## 4. Features Existentes Impactadas
- [`specs/global/features.md`](file:///c:/Users/User/.gemini/antigravity/repos/mec-nica-financeiro/specs/global/features.md) - Módulos de Conciliação por Loja, Cruzamento de Cartão e Fila de Órfãos.
