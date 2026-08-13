# Spec Plan: Conciliation Infinite Carry-Over (177)

## Tasks

- [x] [BACKEND] Criar nova migration `20260813081500_fix_conciliation_carry_over.sql` em `supabase/migrations/`.
- [x] [BACKEND] Atualizar `calculate_daily_conciliation(p_date date)`:
  - Alterar a verificação de `bank_total` para `date <= p_date ORDER BY date DESC LIMIT 1`.
  - Somar `estoque_os_pendente` (status PENDENTE) na variável `v_na_loja_os`.
- [x] [BACKEND] Atualizar `get_conciliation_breakdown(p_store_id text, p_date date)`:
  - Alterar a verificação de `v_bank_total` para `date <= p_date::text ORDER BY date DESC LIMIT 1`.
  - Somar `estoque_os_pendente` (status PENDENTE) nas variáveis de Pátio.
- [x] [BACKEND] Atualizar `get_dashboard_metrics(p_date date)`:
  - Somar `estoque_os_pendente` (status PENDENTE) nas métricas `v_veiculos_patio` (Count) e `v_veiculos_patio_valor` (Soma).
- [x] [BACKEND] Aplicar a migration no Supabase via `npx supabase db query`.
- [x] [TEST] Verificar as RPCs para garantir a propagação correta e a inclusão das OSs do Marco Zero.
