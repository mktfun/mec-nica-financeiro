# Proposal: Limpeza de Cálculos no Frontend (Spec 111)

## Contexto
Agora que você rodou a super migration consolidada no Supabase (que criou o pareamento inteligente e a Matemática Inviolável no banco de dados), o nosso frontend ficou "obsoleto" no bom sentido. Ele continua baixando milhares de linhas desnecessárias e gastando CPU do seu navegador para fazer `.reduce()` e `.filter()` (já que as tabelas React e hooks nÁo sabem que o banco agora pode fazer isso nativamente).

## O Próximo Passo
O objetivo desta Spec é fazer a **Limpeza Cirúrgica do React**. Vamos refatorar as páginas e hooks para que eles apenas consumam as novas RPCs, delegando todo o trabalho pesado.

### O que vamos apagar e substituir:
1. **Dashboard V2 (`useDashboardV2.ts`)**: Será reduzido a poucas linhas. Vai apenas chamar `get_dashboard_metrics` e injetar nos KpiCards.
2. **ConciliaçÁo Pareada (`RedeVsOfxTable.tsx` e `PixVsOfxTable.tsx`)**: VÁo parar de tentar "adivinhar" o match por distância de valor. Elas só vÁo listar as transações que vierem com `match_status = 'MATCHED'`.
3. **Páginas de AgregaçÁo**:
   - `recebiveis.tsx`: Apagar reduce local e chamar `get_receivables_summary`.
   - `patio.tsx`: Apagar reduce local e chamar `get_patio_summary`.
   - `loja.$lojaId.tsx`: Substituir lógicas de loop por `get_store_financial_stats`.

## Impacto Esperado
O site vai ficar pelo menos 10x mais rápido nas telas de carregamento, e finalmente a fonte da verdade da contabilidade estará lacrada no banco de dados, sem o risco do JavaScript errar um centavo.
