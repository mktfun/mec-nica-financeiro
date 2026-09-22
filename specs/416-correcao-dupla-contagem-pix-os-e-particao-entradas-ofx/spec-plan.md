# 📋 Plano de Implementação — Spec 416: Correção de Dupla Contagem de PIX/OS e Partição Canônica de Entradas OFX

## Checklist de Tarefas

### [DB / RPC]
- [x] Task 1: Modificar cirurgicamente o arquivo existente `supabase/migrations/20260917000004_fix_strict_conciliation_date_isolation.sql` atualizando a CTE `ofx_entries` para usar baldes mutuamente exclusivos (ZERO arquivos novos).
- [x] Task 2: Re-aplicar a migration no PostgreSQL do Supabase via script seguro em scratch e verificar `exit code 0`.

### [VERIFICATION / QA]
- [x] Task 3: Executar teste de verificação chamando `get_daily_reconciliation_summary('2026-09-17')` e validar que Planalto (`st-06`) retorna `dif_entradas = 0.00`, `entradas_conciliadas = 15027.26` e `status = 'approved'`.
- [x] Task 4: Validar que todas as outras 9 filiais permanecem com diferença R$ 0,00.
- [x] Task 5: Rodar `npm run build` para validar integridade total da compilação.
