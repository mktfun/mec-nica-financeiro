# Design 195: Isolamento Matemático do Na Loja OS

## 1. Modificações no Banco de Dados (Supabase / RPC)
Deveremos criar a migration `20260814000000_decouple_marco_zero.sql` contendo o `REPLACE FUNCTION` para duas RPCs centrais:

### A) `calculate_daily_conciliation(p_date date)`
- Remover a CTE de `estoque` totalmente.
- Na declaração final, onde estava `COALESCE(patio.v, 0) + COALESCE(estoque.v, 0) as na_loja`, retornar apenas `COALESCE(patio.v, 0) as na_loja`.

### B) `get_dashboard_metrics(p_date date)`
- A mesma coisa: remover a CTE de `estoque`.
- Retirar `COALESCE(estoque.v, 0)` do campo `na_loja`.

## 2. E o Marco Zero?
Os dados na tabela `estoque_os_pendente` continuarão salvos e intocáveis na nuvem. A diferença é que a interface não os misturará coercivamente ao card **Na Loja OS**. Se no futuro a inteligência precisar usar as OS legadas para justificar um PIX órfão que caiu no OFX, a RPC `auto_match_transactions` ainda buscará na tabela `estoque_os_pendente` sem precisar que esse volume bilionário estoure a estética do Dashboard atual do lojista.

## 3. Frontend Component
Nenhuma mudança de componente React é estritamente necessária, uma vez que as funções do Banco farão a limpeza na raiz e passarão para o React os valores purgados do Marco Zero. O card "Na Loja OS" vai renderizar "0,00" novamente quando limpo.
