# Proposal: Faturamento Atual com Justificativas, Abatimento de Diferença na Loja e Breakdown (219)

## Problema
No fluxo atual de conciliação diária:
1. Quando uma transação divergente de uma filial era justificada (ex: PIX recebido de fornecedor, transferência entre contas, ajuste de lançamento), a diferença continuava aparecendo na loja, gerando a sensação de que a pendência não havia sido resolvida.
2. O termo *Faturamento Líquido* não deixava claro que o faturamento do dia é composto pelo valor do Mapa de Metas somado às transações justificadas.
3. Não havia uma janela modal onde o gestor pudesse clicar no card de faturamento e ver a abertura analítica: o valor manual do Mapa de Metas e todas as linhas individuais justificadas com loja, descrição e categoria.

## Solução Proposta
1. **Resolução da Diferença no Card da Loja (`conciliacao.index.tsx`):**
   - Ao justificar uma transação da loja, o valor justificado é **abatido do Previsto da Loja**, fazendo com que a **diferença seja zerada / sanada** (`R$ 0,00` e status aprovado/conforme ✅).
2. **Elevação para o Faturamento Atual (`ResumoDiaPanel.tsx`):**
   - O valor da transação justificada **sobe para o Faturamento Atual**:
     $$\text{Faturamento Atual} = \text{Faturamento Mapa de Metas (Input Manual)} + \sum(\text{Transações Justificadas})$$
   - O card é renomeado de *Faturamento Líquido* para **`Faturamento Atual`**.
   - O campo de input manual passa a ser explicitamente rotulado como **`Faturamento Mapa de Metas`**.
3. **Modal de Transparência e Detalhamento (`FaturamentoAtualBreakdownModal`):**
   - Ao clicar no card de **Faturamento Atual**, abre-se um modal detalhado exibindo:
     - **Card de Faturamento Mapa de Metas:** Valor base informado.
     - **Tabela de Transações Justificadas:** Loja, Descrição bancária/cartão original, Categoria, Motivo/Justificativa digitada e Valor (R$).
     - **Total Consolidado do Faturamento Atual.**

## Contratos de Dados
- **Tabelas Supabase:**
  - `daily_snapshots`: `faturamento` (Mapa de Metas), `faturamento_outros_valor` (Soma das justificativas do dia).
  - `ofx_transactions`, `pos_transactions`, `manual_transactions`: `manual_category`, `manual_justification`, `amount`, `store_id`, `target_date`.
- **Hooks:**
  - `useJustifiedTransactions(date)`: Hook reativo para listar transações justificadas e calcular totais por loja e global.

## API / Interface
- `src/components/conciliacao/FaturamentoAtualBreakdownModal.tsx`: Modal detalhado de composição.
- `src/components/conciliacao/ResumoDiaPanel.tsx`: Ajuste no cálculo de faturamento atual, novo rótulo Mapa de Metas e trigger de clique no card.
- `src/routes/conciliacao.index.tsx`: Abatimento das justificativas no cálculo de diferença de cada loja.

## Risco Principal
- **Risco:** Re-calcular a diferença sem sincronizar com as mutações de justificativa.
- **Probabilidade:** Baixa.
- **Impacto:** Reversível.
- **Mitigação:** Invalidação automática das queries de conciliação e snapshots no `useCategorizeOrphan` para re-renderizar o card da loja e o painel superior simultaneamente.
