# Proposal: Views e RPCs Analíticas no Backend (Spec 110)

## Contexto e Investigação

O frontend atual baixa massas de dados brutas e realiza cálculos agressivos de soma, filtro e redução (ex: `.reduce()` e `.filter()`) diretamente em JavaScript. Isso causa gargalos de performance pesados, consome tráfego desnecessário e espalha a lógica de negócios por componentes React (Business Logic Drift).

A pedido, esta spec elabora as funções analíticas no PostgreSQL para as páginas de **Contas a Receber**, **Pátio** e **Loja**, removendo o esforço computacional do lado do cliente. Nenhuma alteração no React ocorrerá nesta etapa.

## Proposta de Solução

### 1. `get_receivables_summary`
Retorna totais financeiros agregados por loja (e globais) isolando contas `pendentes` e `vencidas` usando lógica nativa de datas e status no banco.

### 2. `get_patio_summary`
Varrerá a tabela `patio_os`, calculando internamente a matemática `total_value - paid_value` e agrupando os saldos em aberto e parcialmente pagos sem precisar trafegar o array de veículos pro navegador.

### 3. `get_store_financial_stats`
Substitui a varredura e filtro local de `transactions` por loja. A função usará agrupamento avançado `GROUP BY type` para agregar `Entradas` e `Saídas` mensais (ou de um período).

## Migração Criada
Uma migration estrutural contendo as 3 funções PL/pgSQL foi gerada em:
`supabase/migrations/20260807000002_backend_aggregation_views.sql`
