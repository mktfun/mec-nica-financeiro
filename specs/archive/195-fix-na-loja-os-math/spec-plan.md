# Spec Plan 195

## Tasks

- [x] [BACKEND/DATABASE] Criar arquivo de migration SQL (`20260814000000_decouple_marco_zero.sql`) em `supabase/migrations`.
- [x] [BACKEND/DATABASE] Dentro dessa migration, reescrever a função `get_dashboard_metrics(p_date date)` retirando a dependência matemática (CTE e somatório) da tabela `estoque_os_pendente`.
- [x] [BACKEND/DATABASE] Reescrever a função `calculate_daily_conciliation(p_date date)` também tirando a somatória do Marco Zero (`estoque_os_pendente`), retornando-a à sua forma pura de contagem de pátio atual.
- [x] [TEST] Executar o script no banco local ou aplicar pelo Supabase CLI. Recarregar o site localmente e confirmar que o card Na Loja OS mostra o saldo coerente do dia/pátio, sem o R$ 1.5M intrusivo.
