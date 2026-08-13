# Proposal: Correção Crítica de Cartesian Product via CTEs (189)

## Problema
A tela de conciliação normal e a listagem de lojas estão exibindo valores astronômicos (na casa dos milhões). O diagnóstico aponta para a ocorrência de "Cartesian Products" (Explosão de JOINs) em agregações de banco de dados (`SUM()`) entre tabelas de granularidades incompatíveis (ex: multiplicar o número de ordens de serviço pelo número de transações de cartão).
Além de distorcer completamente os resultados do Dashboard Executivo e da Matriz de Conciliação V2, as queries atuais (ou as tentativas de refatoração) não estão isolando as agregações antes do JOIN, e o uso de cursores/loops (`FOR store_record...`) gera N+1 lentos.

## Solução Proposta
1. **Refatoração Cirúrgica das RPCs de Agregação (`get_dashboard_metrics` e `calculate_daily_conciliation`)**:
   - Substituir a lógica frágil (possivelmente injetada via console do Supabase) ou lenta de loops por **CTEs (Common Table Expressions)**.
   - A regra de ouro: **Isolamento de Agregação (Early Aggregation)**. Cada tabela base (`ofx_transactions`, `patio_os`, `estoque_os_pendente`, `transactions`) será agrupada (`GROUP BY store_id`) e somada (`SUM()`) *dentro de sua própria CTE isolada*, gerando exatamente uma linha por loja.
   - Apenas no SELECT final as CTEs pré-agregadas serão ligadas via `LEFT JOIN` com a tabela `stores`. Isso matematicamente zera a chance de explosão cartesiana.
2. **Revisão de Multiplicação de Cents no Frontend**:
   - Uma varredura final no React (`useConciliacao.ts` e afins) garantirá que não haja reprocessamento cruzado (`* 100` acidental) nos valores que já chegam prontos do backend.

## Contratos de Dados
- **Tabelas Supabase Afetadas:** Leitura isolada de `transactions`, `ofx_transactions`, `patio_os`, `estoque_os_pendente`, `reconciliations`, `daily_snapshots`.
- **Campos:** As RPCs continuarão a retornar os mesmos JSONBs exatos (array de lojas, macro métricas, etc), garantindo **retrocompatibilidade total** com o frontend.

## API / Interface
- **RPC `get_dashboard_metrics(p_date)`**: Terá sua definição sobrescrita no backend com arquitetura CTE.
- **RPC `calculate_daily_conciliation(p_date)`**: Terá sua definição sobrescrita no backend com arquitetura CTE.

## Features Existentes Impactadas
- **Dashboard Global (V2)**: Será estabilizado.
- **Conciliação Diária (Listagem de Lojas)**: Mostrará os valores exatos de faturamento e divergência, em vez de multiplicações milionárias.

## Risco Principal
- **Probabilidade**: Média.
- **Impacto**: Reversível.
- **Risco**: A reescrita massiva usando `LEFT JOIN` e CTEs em SQL pode retornar `NULL` onde antes o cursor ou a aplicação assumia `0`.
- **Mitigação**: O SQL final fará envelopamento rigoroso com `COALESCE(cte.valor, 0)` em todos os acessos dos `LEFT JOIN`s. Se alguma store não tiver dados naquele dia em alguma tabela, o valor padrão de 0 mantém o comportamento seguro e determinístico.
