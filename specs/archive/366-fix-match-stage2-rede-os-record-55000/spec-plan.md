# Spec Plan — Spec 366: Correção de `v_chosen_os RECORD` na RPC `match_stage2_rede_os`

## Tasks

- [x] [BACKEND] Criar migration `supabase/migrations/20260903000030_fix_match_stage2_rede_os_v_chosen_os_record.sql`:
  - [x] Substituir `v_chosen_os RECORD;` por escalares tipados (`v_chosen_os_id`, `v_chosen_os_number`, `v_chosen_os_total_value`, `v_chosen_os_paid_value`, `v_chosen_os_status`).
  - [x] Inicializar os escalares como `NULL` a cada iteração do loop.
  - [x] Ajustar os comandos `SELECT ... INTO` e a condição de guarda `IF v_chosen_os_id IS NOT NULL THEN`.
  - [x] Aplicar no banco remoto Supabase via `supabase db query --linked`.
  - [x] Testar a RPC no banco remoto com `SELECT public.match_stage2_rede_os('2026-09-02')`.

- [x] [TEST] Validação e Quality Gate:
  - [x] Executar typecheck e build (`bun run build`).
  - [x] Confirmar ausência do erro SQLSTATE 55000.
