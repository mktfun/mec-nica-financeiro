# Spec Plan: Fix Dashboard V2 Time Leakage

## Etapas de ImplementaçÁo

- [ ] **Etapa 1: Atualizar Query `recsAll` em `useDashboardV2.ts`**
  - Onde: `src/hooks/useDashboardV2.ts`
  - AçÁo: Na `Promise.all` que busca a tabela `reconciliations`, adicionar `.lte('date', dateAtual)`.
  - Objetivo: Prevenir que a carga na rede arraste saldos do futuro se a tabela possuir lixo ou testes futuros.

- [ ] **Etapa 2: Refatorar o agrupamento `latestByStore` e `latestPrevByStore`**
  - Onde: `src/hooks/useDashboardV2.ts`
  - AçÁo: Ajustar a validaçÁo do laço de repetiçÁo `for (const row of recsAll.data || [])`.
  - Lógica para o dia selecionado: `if (row.date <= dateAtual && (!latestByStore[row.store_id] || row.date > latestByStore[row.store_id].date))`
  - Lógica para o dia anterior: `if (row.date <= dateAnterior && (!latestPrevByStore[row.store_id] || row.date > latestPrevByStore[row.store_id]))`
  - Objetivo: Garantir que o reducer seja puramente reativo à "Máquina do Tempo" imposta pelo state `dateAtual` do componente.

## Risco de RegressÁo
- A mudança restringe a leitura de dados, logo, os usuários apenas deixarÁo de ver os "17 milhões do futuro". NÁo afeta gravações de banco de dados nem quebra outros componentes, já que `useDashboardV2` é um hook read-only isolado para aquela View.
