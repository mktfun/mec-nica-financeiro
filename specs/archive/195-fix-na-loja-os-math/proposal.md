# Proposal 195: Remoção do Marco Zero do Card "Na Loja OS"

## 1. O Problema
Ao clicar na Lixeira da importação do dia, os faturamentos de Pátio (tabela `patio_os`) do dia são apagados, como esperado. Porém, o card **NA LOJA OS** no Dashboard e nos demais painéis continua exibindo o valor massivo de **R$ 1.596.629,29**. 
O usuário fica confuso e irritado, achando que o botão de apagar quebrou.

## 2. A Causa Raiz
No dia 13/08, uma migration SQL adicionou o saldo da tabela `estoque_os_pendente` (o famigerado "Marco Zero" importado da planilha histórica) na soma geral do "Na Loja OS" via a instrução `COALESCE(patio.v, 0) + COALESCE(estoque.v, 0) as na_loja`.

O botão de lixeira da aba de Pátio limpa somente as OS recém importadas da rotina diária (`patio_os`), mas o banco continua somando o passivo gigantesco e permanente da tabela `estoque_os_pendente`, retornando sempre o saldo sujo.

## 3. A Solução
Para estabilizar a percepção visual do usuário:
1. **Desacoplamento do Marco Zero:** Vamos remover `estoque_os_pendente` das RPCs principais que alimentam a coluna "Na Loja OS" (`calculate_daily_conciliation`, `get_dashboard_metrics` e views associadas). 
2. O "Na Loja OS" voltará a refletir 100% da realidade diária/corrente do pátio (`patio_os`). Quando a lixeira for acionada, ele zerará para R$ 0,00 como antes.
3. Se o Marco Zero precisar ser visto num painel futuro, ele terá seu próprio Card separado, não poluindo o fluxo de caixa pendente corrente.
