# Spec Plan: Correção Integral da Conciliação Diária, Odômetro Anterior, Justificativas e Cofre (338)

## Tasks

- [x] [BACKEND] Criar migration `20260901000013_fix_canonical_odometro_and_step2_justifications.sql` corrigindo a RPC `get_daily_reconciliation_summary` (odômetro anterior, delta faturamento, agregação universal de justificativas de entrada e despesas extras)
- [x] [BACKEND] Aplicar migration no banco de dados via Supabase CLI / Client
- [x] [FRONTEND] Corrigir erro SQL 42703 em `Step3CashVaultDaniel.tsx` (join relacional com `stores(name)`)
- [x] [FRONTEND] Corrigir persistência e queries em `Step2NonRevenueJustifications.tsx` (upsert em `daily_revenue_adjustments` e remoção de colunas inexistentes)
- [x] [FRONTEND] Corrigir busca de PIX e REDE órfãos em `CentralImportWizard.tsx` (`fetchRealUnmatchedTransactions`) e blindagem de snapshot draft (`is_closed: false`)
- [x] [TEST] Executar build gate (`npm run build`) e validar 0 erros de compilação TypeScript
- [x] [TEST] Testar cálculo de faturamento, cofre e justificativas no browser em `http://localhost:8080/`
