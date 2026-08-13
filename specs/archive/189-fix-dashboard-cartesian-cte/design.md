# Design: Correção Crítica de Cartesian Product via CTEs (189)

## Arquitetura Técnica
Substituição dos blocos de loop interativo N+1 e JOINs explosivos por *Early Aggregation via CTE*.

**Fluxo CTE SQL:**
```sql
WITH maq AS (
  SELECT store_id, SUM(amount) as v FROM ofx_transactions WHERE ... GROUP BY 1
),
pix AS (
  SELECT store_id, SUM(amount) as v FROM ofx_transactions WHERE ... GROUP BY 1
),
patio AS (
  SELECT store_id, SUM(total_value - paid_value) as v FROM patio_os WHERE ... GROUP BY 1
),
estoque AS (
  SELECT store_id, SUM(valor_os) as v FROM estoque_os_pendente WHERE ... GROUP BY 1
)
SELECT s.id as store_id,
       COALESCE(maq.v, 0) as maquininha,
       COALESCE(pix.v, 0) as pix,
       COALESCE(patio.v, 0) + COALESCE(estoque.v, 0) as na_loja_os
FROM stores s
LEFT JOIN maq ON maq.store_id = s.id
LEFT JOIN pix ON pix.store_id = s.id
LEFT JOIN patio ON patio.store_id = s.id
LEFT JOIN estoque ON estoque.store_id = s.id
```

Essa estrutura processa o banco inteiro em uma única varredura perfeitamente particionada, sem chance matemática de produto cartesiano, com performance imensamente superior ao cursor.

## Componentes / Hooks / Funções
- **Migration SQL (`20260813130000_fix_cartesian_ctes_rpc.sql`)**: 
  1. Sobrescreve `calculate_daily_conciliation(p_date)` trocando os SELECTs independentes no FOR LOOP para a construção CTE paralela que retorna array JSON (`jsonb_agg`).
  2. Sobrescreve `get_dashboard_metrics(p_date)` implementando a mesma mecânica segura para carregar as métricas por loja (e totais da oficina).

## Fluxo de UI
A UI não precisará de adaptação. O retorno do banco continua idêntico:
- Um array JSON contendo as lojas com `maquininha`, `pix`, `faturamento`, etc.
- No React, não faremos operações em massa (multiplicação de cents que gere corrupção) pois as RPCs já retornam na base monetária real (BRL). A varredura em `useConciliacao.ts` ou `useBackendDashboard.ts` apenas servirá para garantir que o front seja puramente declarativo.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Renderização do dashboard global. Resultado esperado: "Faturamento" não exibe $5.000.000, mas o valor real de R$ 5.000,00, sem multiplicadores implícitos.
- **Cenário 2:** Renderização da lista de lojas na tela "Matriz". Resultado esperado: "OS Na Loja" ou "Previsto Maquininha" somam unicamente a data do dia sem multiplicar pelo número de clientes.
