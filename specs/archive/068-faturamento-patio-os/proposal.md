# Spec 068: Correção Definitiva da Fonte de Verdade do Faturamento (Migração para `patio_os`)

## 1. Visão Geral (O Problema)
O usuário relatou que o "Faturamento" está zerado em todas as lojas e no histórico ("mesmo com histórico"). 
Após investigação, identificou-se que o Faturamento atual estava sendo calculado com base na coluna `total_os` da tabela `import_logs`. Como nas importações passadas havia um bug (corrigido recentemente na Spec 065) que inseria `0` nessa coluna, todo o histórico ficou zerado.

## 2. A Solução (A Proposta)
Em vez de tentar fazer um script para preencher o histórico quebrado no `import_logs`, a solução mais robusta, inteligente e à prova de falhas é **mudar a fonte de verdade do Faturamento**.
Temos a tabela `patio_os`, que é o repositório central de todas as Ordens de Serviço. As OSs finalizadas possuem o campo `closed_at` (Data de Fechamento) e `total_value` (Valor Bruto da OS).

A proposta é:
1. Alterar a query do hook `useDashboardV2.ts` para incluir a coluna `closed_at` da tabela `patio_os`.
2. O Faturamento de um determinado dia passará a ser a **soma de `total_value` de todas as OSs em `patio_os` onde `closed_at` é igual a esse dia**.
3. O Faturamento Global continuará somando também os lançamentos manuais eventuais (`faturamento_outros_valor` do `daily_snapshots`).
4. Com isso, o gráfico de histórico (Macro Chart) será preenchido perfeitamente com dados retroativos reais e exatos das OSs, e a tabela de Resultado por Loja também ganhará os valores instantaneamente, sem que o usuário precise reimportar planilhas antigas.

## 3. Impacto e Benefícios
- **Histórico Automático:** Todo o Faturamento do passado que estava "escondido" no `patio_os` voltará a aparecer magicamente no gráfico.
- **Resiliência:** Mesmo que o log de importação falhe, enquanto as OSs estiverem no banco de dados, o Faturamento será preciso.
- **Consistência:** Faturamento agora significa oficialmente "Soma do valor das OSs Fechadas na data + Faturamentos Manuais".
