# Spec Plan: Limpeza de Cálculos no Frontend (Spec 111)

## Objective
Remover as funções de iteração O(N) e somatórias (`.reduce()`, `.filter()`) dos componentes React, utilizando as RPCs geradas no Supabase para entregar dados agregados diretamente.

## Tasks

### Fase 1: Limpeza Mestre (Dashboard & Conciliação)
- [x] [FRONTEND] Alterar `src/hooks/useDashboardV2.ts` para chamar `get_dashboard_metrics` via Supabase e repassar os 10 valores invioláveis direto para o retorno do Hook.
- [x] [FRONTEND] Em `RedeVsOfxTable.tsx` e `PixVsOfxTable.tsx`, refatorar a leitura para utilizar as colunas `matched_ofx_id` e `match_status`.
- [x] [FRONTEND] Adicionar um botão de "Parear Transações" no Header da Conciliação Diária, disparando `auto_match_transactions`.

### Fase 2: Limpeza das Telas Menores
- [x] [FRONTEND] Atualizar `recebiveis.tsx` para usar o retorno de `get_receivables_summary`.
- [x] [FRONTEND] Atualizar `patio.tsx` para usar o retorno de `get_patio_summary`.
- [x] [FRONTEND] Atualizar `loja.$lojaId.tsx` para buscar os agregados mensais via `get_store_financial_stats`.

## Save-State
- Status Atual: Implementado
- Fase: 2
- Impedimentos: Nenhum
