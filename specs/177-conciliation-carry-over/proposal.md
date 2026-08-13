# Proposal: Conciliation Infinite Carry-Over & Marco Zero OS Integration (177)

## Problema
O usuário deseja a garantia matemática de que o sistema seja capaz de carregar os valores do "Marco Zero" adiante indefinidamente, incluindo tanto o saldo bancário quanto o arquivo completo de OSs importado no Marco Zero.

Auditando o banco de dados (RPCs de conciliação), constatei dois furos matemáticos cruciais:
1. **O Ponto Cego do Saldo Bancário:** As RPCs que alimentam a tela individual de conciliação (`calculate_daily_conciliation` e `get_conciliation_breakdown`) estão buscando o saldo bancário da loja de forma engessada: `WHERE date = p_date`. 
   - Isso significa que se você ficar um dia sem importar extrato novo, o sistema acha que o saldo base do banco é 0. Ele não carrega o saldo do dia anterior.
2. **O Abismo do Marco Zero (OSs Legadas):** Quando você importa a planilha do Marco Zero, as OSs são salvas em uma tabela dedicada chamada `estoque_os_pendente`. No entanto, **TODAS as RPCs do Dashboard e da Conciliação estão lendo apenas a tabela `patio_os`**. 
   - Resultado: O valor das OSs antigas que você importou pelo Marco Zero fica completamente INVISÍVEL na métrica "Pátio da Oficina" e "Veículos no Pátio".

## Solução Proposta
Vamos fechar o cerco da matemática infinita fundindo esses dados no backend:
1. **Carry-over de Saldo:** Substituir a consulta restrita (`date = p_date`) por uma consulta de última posição conhecida (`date <= p_date ORDER BY date DESC LIMIT 1`) na busca do `bank_total`.
2. **Integração do Marco Zero:** Alterar os cálculos de `na_loja_os` em TODAS as RPCs (`get_dashboard_metrics`, `get_conciliation_breakdown` e `calculate_daily_conciliation`) para que a soma seja:
   - `(Total Devido na patio_os) + (Total Devido na estoque_os_pendente)`
   Isso garantirá que as OSs importadas pela planilha do Marco Zero inflarão corretamente o valor do Pátio desde o dia 1 até que sejam baixadas/pagas.

Com isso:
- O Marco Zero injeta o Saldo Inicial e o Estoque Inicial.
- O saldo bancário flui infinitamente mesmo se houver lacunas de dias sem importação.
- O valor do Pátio consolida o novo (Pátio OS) com o velho (Estoque OS Pendente) perfeitamente.

## Contratos de Dados
- Nenhuma estrutura de tabela muda.
- Será gerada uma nova migration alterando as RPCs para considerar a soma do `estoque_os_pendente`.

## Risco
- **Risco:** Zero. Esta é a regra de ouro contábil (Last Known Balance). O impacto é puramente positivo, resolvendo os "buracos" de dias sem movimento que zeravam a tela de conciliação no passado.
