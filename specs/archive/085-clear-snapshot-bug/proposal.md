# Proposal: Fix Clear Data Missing Snapshots (085)

## Problema
O usuário relata que ao acionar o botão "Limpar Todos os Dados" (que deveria zerar a base), os campos "Dinheiro MP" e "A Receber" continuam com valores. Além disso, no subtotal de contas, aparece um valor como "Juros (REDE) + Pagar + Provisão R$ 1.018,36" fantasma em dias sem importação, persistindo até mesmo após limpar o banco.

**Causa Raiz:**
1. Os dados de entradas manuais ("Dinheiro MP", "A Receber") e dados globais capturados dos arquivos (como os Juros somados das maquininhas da Rede) são gravados na tabela `daily_snapshots`.
2. A rotina `useClearAllData` no arquivo `src/hooks/useImportProcessor.ts` foi programada para deletar registros de várias tabelas (`transactions`, `patio_os`, `receivables`, `import_logs`, etc.), mas **esqueceu de incluir a tabela `daily_snapshots`**.
3. O resultado é que os snapshots diários continuam vivos no banco. O Dashboard de conciliação usa o fallback de buscar "o snapshot do dia ou o último salvo", resultando em dados fantasmas de juros e valores manuais se espalhando pelas telas e sobrevivendo a apagões no sistema.

## Solução Proposta
1. Incluir a tabela `daily_snapshots` no array de tabelas apagadas pela rotina `useClearAllData` (`src/hooks/useImportProcessor.ts`).
2. Isso garantirá que o reset do sistema seja completo e destruirá os dados manuais persistentes e juros que ficaram para trás.

## Risco Principal
Não há risco estrutural, a ação apenas alinha a função de limpar tudo com o seu objetivo inicial de remover os dados temporários do período em análise.
