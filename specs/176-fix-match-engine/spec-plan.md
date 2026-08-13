# Spec Plan: Fix Match Engine (176)

## Tasks

- [x] [BACKEND] Criar nova migration `20260812100400_fix_auto_match_rpc_date_window.sql` em `supabase/migrations/`.
- [x] [BACKEND] No arquivo da migration, reescrever `CREATE OR REPLACE FUNCTION auto_match_transactions(p_date date)` com as seguintes lógicas:
  - Na busca por OS (`patio_os`): Trocar `DATE(closed_at) = p_date` por `DATE(closed_at) >= p_date - interval '3 days' AND DATE(closed_at) <= p_date`.
  - Adicionar na busca por OS a ordenação: `ORDER BY DATE(closed_at) DESC LIMIT 1`.
  - Na busca por Maquininha (`pos_transactions`): Trocar `occurred_at::date = p_date` por `occurred_at::date >= p_date - interval '3 days' AND occurred_at::date <= p_date`.
  - Adicionar/manter a ordenação `ORDER BY occurred_at DESC, net_amount DESC` (para pegar as maquininhas mais recentes primeiro).
- [x] [BACKEND] Aplicar a migration ao banco local / remoto conforme configurado.
- [x] [TEST] Reexecutar uma simulação de importação ou chamar a RPC para verificar se a taxa de match subiu.
