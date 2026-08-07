# Design: Fix Clear Data Missing Snapshots (085)

## Arquitetura Técnica
A rotina de exclusÁo massiva `useClearAllData` itera sobre um array predefinido de tabelas para apagar tudo (com exceçÁo de IDs zero/uuid default). A tabela `daily_snapshots` guarda os metadados manuais globais para cada `target_date` (ex: faturamento_outros_valor, dinheiro_mp, a_receber_manual, juros_rede). Ao nÁo ser apagada, ela orfÁ esses dados. A correçÁo é estritamente adicionar o nome da tabela ao array de alvos de exclusÁo.

## Componentes Afetados
- `src/hooks/useImportProcessor.ts`
  - FunçÁo: `useClearAllData`
  - Variável: `tables` (array de strings)

## Fluxo de ExecuçÁo
1. O array `tables` dentro do hook recebe a nova string `'daily_snapshots'`.
2. A exclusÁo rodará normalmente.
3. Ao zerar os dados, a conciliaçÁo deixará de carregar Juros fantasmas e inputs de Dinheiro MP obsoletos.
