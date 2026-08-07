# Design: Fix Conciliação Diária (Fluxo de Caixa e Contas OFX)

## 1. Banco de Dados (RPC `get_dashboard_metrics`)
- Modificar `get_dashboard_metrics(p_date)` para injetar restrição `AND source = 'ofx'` ao agregar as saídas (`type = 'out'`).
- Substituir o cálculo de `v_fluxo_caixa` (que era `faturamento - despesas`) por uma subquery defensiva que leia o `caixa_atual` do último fechamento anterior na tabela `daily_snapshots`.

## 2. Frontend (`useBackendConciliacao.ts` e UI)
- Expandir o retorno hook ou criar uma função que devolva `ofxOutTotal` somando todas as transações importadas do OFX de saída, na data filtrada.
- No componente `conciliacao.index.tsx`, remover o hardcode de `totalOfxOut={0}` e substituir pela variável reativa retornada pelo hook.
- Validar se a fórmula interna do `ResumoDiaPanel` assimilará adequadamente o `totalOfxOut` dentro de `contasAPagarAutomatico`.
