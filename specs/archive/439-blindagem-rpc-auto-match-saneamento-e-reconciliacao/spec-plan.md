# Spec Plan — 439: Blindagem do RPC auto_match_daily_transactions, Saneamento e Reconciliação Completa

## [DB] Migration das RPCs PostgreSQL

- [x] **Completed** — Criar migration `supabase/migrations/20260924160000_strict_auto_match_daily_transactions.sql`:
  - **`auto_match_daily_transactions`:**
    - Fase 0C: Adicionar filtros para todas as empresas do grupo (`%MP AUTO MECANICA%`, `%MP JABAQUARA%`, `%MECANICA POPULAR%`) com `matched_os_number = null`.
    - Fase 2: Remover 2B e 2C cegos por `total_value` e `total_value - paid_value`.
    - Fase 2: Exigir cumulativamente `pix_transfer_value > 0`, tolerância $\le 0.05$ e validação de identidade (documento CPF/CNPJ ou tokens de nome fortes).
  - **`auto_match_receivables`:**
    - Bloquear intercompany e adquirentes de darem baixa em carteira de recebíveis.
  - Aplicar migration via MCP Supabase `execute_sql`.
  **Verificação:** Ambas as RPCs aplicadas no Supabase com sucesso.

## [DB] Saneamento Forense de Vínculos Inválidos

- [x] **Completed** — Executar script de limpeza para a data 24/09/2026:
  - Resetar `matched_os_number = null` para os 2 PIX intercompany (`RECEBIMENTOS MP AUTO MECANICA...` de R$ 1.510 e `RECEBIMENTOS MP JABAQUARA...` de R$ 1.000).
  - Remover os 2 registros errôneos em `conciliation_matches`.
  - Reverter status e `match_status` das OSs #619 e #1894 em `patio_os`.
  **Verificação:** `SELECT count(*) FROM ofx_transactions WHERE target_date = '2026-09-24' AND counterpart_name ILIKE '%MECANICA POPULAR%' AND matched_os_number IS NOT NULL` retornou 0.

## [BACKEND] Execução da Conciliação Completa

- [x] **Completed** — Executar a esteira completa para `2026-09-24`:
  - `SELECT public.auto_match_daily_transactions('2026-09-24')`
  - `SELECT public.auto_match_receivables('2026-09-24')`
  - `SELECT public.auto_match_saidas('2026-09-24')`
  **Verificação:** Apenas os 6 PIX legítimos de clientes constam com `matched_os_number` preenchido.

## [SECURITY/TEST]

- [x] **Completed** — Auditoria final dos vínculos de 24/09/2026 no banco via SQL: exatamente 6 PIX legítimos vinculados, zero falsos positivos, transferências intercompany isoladas.
- [x] **Completed** — Terminal Gate: `cmd.exe /c "npm run build"` com exit code 0 em 9.04s.
