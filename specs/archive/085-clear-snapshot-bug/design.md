# Design: Fix Clear Data Missing Snapshots (085)

## Arquitetura Técnica
A rotina de exclusão massiva `useClearAllData` itera sobre um array predefinido de tabelas para apagar tudo (com exceção de IDs zero/uuid default). A tabela `daily_snapshots` guarda os metadados manuais globais para cada `target_date` (ex: faturamento_outros_valor, dinheiro_mp, a_receber_manual, juros_rede). Ao não ser apagada, ela orfã esses dados. A correção é estritamente adicionar o nome da tabela ao array de alvos de exclusão.

## Componentes Afetados
- `src/hooks/useImportProcessor.ts`
  - Função: `useClearAllData`
  - Variável: `tables` (array de strings)

## Fluxo de Execução
1. O array `tables` dentro do hook recebe a nova string `'daily_snapshots'`.
2. A exclusão rodará normalmente.
3. Ao zerar os dados, a conciliação deixará de carregar Juros fantasmas e inputs de Dinheiro MP obsoletos.
