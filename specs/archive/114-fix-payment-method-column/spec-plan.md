# Spec Plan: 114-fix-payment-method-column (114)

## Tasks

- [x] [BACKEND] Criar a migration `20260807000006_fix_payment_method_typo.sql` redefinindo `calculate_daily_conciliation` com o nome de coluna correto (`payment_method`).
- [x] [BACKEND] Aplicar a migration no Supabase via script Node `pg` (Bypass runner).
- [x] [TEST] Verificar console e UI do Dashboard para confirmar o pleno funcionamento.
