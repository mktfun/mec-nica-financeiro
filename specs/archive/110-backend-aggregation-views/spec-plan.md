# Spec Plan: Backend Aggregation Views (Spec 110)

## Objective
Criar Views/RPCs no banco de dados para agregar métricas e remover loops matemáticos (`.reduce`) do frontend. Os arquivos React nÁo devem ser alterados nesta etapa.

## Tasks
- [x] [PROPOSAL] Redigir plano de arquitetura focando apenas no backend.
- [ ] [BACKEND] Criar nova migration `20260807000002_backend_aggregation_views.sql` contendo:
  - RPC `get_receivables_summary()`
  - RPC `get_patio_summary()`
  - RPC `get_store_financial_stats(p_store_id, p_start_date, p_end_date)`
- [ ] [BACKEND] Salvar o arquivo de migration e finalizar a proposta para revisÁo do usuário.

## Save-State
- Status Atual: Elaborando Migration
- Fase: 1
- Impedimentos: Nenhum
