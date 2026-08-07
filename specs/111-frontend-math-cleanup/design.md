# Design Document: Limpeza de Cálculos no Frontend (Spec 111)

## 1. VisÁo Geral da Arquitetura
A lógica de negócio passará de "Client-Side Processing" para "Database-Driven Aggregation". O React será degradado à sua funçÁo original: camada de apresentaçÁo de dados pre-computados. 

## 2. Abordagem por Módulo

### A. Dashboard V2
O hook `useDashboardV2.ts` será refatorado para utilizar o Supabase Client para acionar a RPC `get_dashboard_metrics(date)`. Todo o retorno (`saldoTotal`, `dinheiroMp`, etc) será injetado diretamente no state, eliminando blocos de `.reduce` e arrays locais.

### B. ConciliaçÁo (Matcher)
Os arquivos `RedeVsOfxTable.tsx` e `PixVsOfxTable.tsx` atualmente buscam transações independentes e as comparam usando lógicas de array JS (ex: `data.find()`). Eles passarÁo a consultar a tabela `transactions` e `patio_os` focando apenas em itens onde `match_status = 'MATCHED'` ou `matched_ofx_id IS NOT NULL`, apresentando as amarrações que a RPC `auto_match_transactions` já fez no backend.
> Nota: Pode ser necessário expor uma açÁo via botÁo na UI (ex: "Processar Pareamento Automático") que dispara a RPC, ou rodá-la no Edge Functions. Para esta Spec, o botÁo disparará a RPC.

### C. Páginas de AgregaçÁo (Recebíveis, Pátio, Loja)
- Em `recebiveis.tsx`: Substituiremos o fetch genérico por `supabase.rpc('get_receivables_summary')`.
- Em `patio.tsx`: Substituiremos o fetch genérico por `supabase.rpc('get_patio_summary')`.
- Em `loja.$lojaId.tsx`: A tela chamará `supabase.rpc('get_store_financial_stats', { p_store_id: id, ... })`.

Nenhuma dessas páginas precisará iterar arrays nativos via JavaScript para computar totais (KpiCards).
