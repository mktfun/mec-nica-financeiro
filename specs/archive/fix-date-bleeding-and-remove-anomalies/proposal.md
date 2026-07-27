# Proposal: Correção de Vazamento de Datas na Conciliação Diária & Remoção de Observações Críticas (fix-date-bleeding-and-remove-anomalies)

## Problema

1. **Vazamento de Valores Entre Datas (`NA LOJA OS` acumulado):**
   - Ao selecionar datas diferentes na Conciliação Diária (ex: 25/07/2026 vs 23/07/2026), os valores de OSs do Pátio (`NA LOJA OS` = R$ 99.859,02) vazavam e apareciam repetidos em todos os dias.
   - **Causa Raiz:** A consulta `useModulo1StoresData` em `src/hooks/useConciliacao.ts` buscava a tabela `patio_os` e `receivables` **sem filtrar pela data selecionada (`target_date` / `closed_at` / `entry_date`)**, somando todas as OSs de todo o histórico do banco para qualquer dia selecionado.

2. **Seção Disfuncional "Observações Críticas (Sem OS)":**
   - O usuário solicitou explicitamente a remoção da seção "Observações Críticas (Sem OS)" no painel de fechamento (`ResumoDiaPanel.tsx`), alegando ser disfuncional e poluída.

## Solução Proposta

1. **Filtragem Estrita por Data em `useModulo1StoresData`:**
   - Ajustar as consultas de `patio_os` e `receivables` em `src/hooks/useConciliacao.ts` para filtrar rigorosamente os lançamentos da data selecionada (`target_date` ou `closed_at` / `entry_date`), garantindo que o valor de `NA LOJA OS` e `A RECEBER` seja isolado dia a dia.

2. **Remoção da Seção "Observações Críticas (Sem OS)":**
   - Remover o bloco de renderização de `anomalies` e a consulta de anomalias em `ResumoDiaPanel.tsx`.

3. **Validação do Fechamento Limpo por Data:**
   - Garantir que dias sem movimentação (ex: 25/07/2026) exibam `NA LOJA OS: R$ 0,00` e `SALDO TOTAL: R$ 0,00` sem vazamento de datas anteriores.

## Contratos de Dados
- Função `useModulo1StoresData(date: string)` em `src/hooks/useConciliacao.ts`

## Features Existentes Impactadas
- `src/hooks/useConciliacao.ts`
- `src/components/conciliacao/ResumoDiaPanel.tsx`

## Risco Principal
OSs em aberto cadastradas sem `target_date` ficarem omissas.
*Mitigação:* Usar fallback para `entry_date` ou `closed_at` correspondente ao dia selecionado.
