# Spec Plan: Fix Raio-X de Saldos Bancários (381)

## Tasks

- [x] [BACKEND] Criar migration `20260909000040_fix_raiox_restore_dinheiro_rede.sql` que recria a RPC `get_daily_reconciliation_summary` com:
  - [x] CTE `rede_agg` com cálculo de `nao_entrou_valor` e `entrou_valor` (filtro por `settlement_status`)
  - [x] CTE `vault_agg` com filtro temporal `entry_date <= v_target_date::date AND status IN ('em_transito', 'pending')` e retorno de `vault_entries`
  - [x] `jsonb_build_object` por loja com campos `saldo_banco_ofx`, `nao_entrou_valor`, `entrou_valor`, `status_compensacao`, `vault_entries`
  - [x] Pilar global `v_dinheiro_lojas` com filtro temporal `<= date` e status `em_transito/pending`
  - [x] Pilar global `v_cartoes_a_compensar` com filtro estrito por `settlement_status IN ('nao_entrou', 'a_compensar')`
  - [x] Preservar TODAS as correções de matching/anti-hijack da migration 20260908000036

- [x] [BACKEND] Migration `20260909000040_fix_raiox_restore_dinheiro_rede.sql` criada + Auto-healing e enriquecimento defensivo implementado no client (`useBackendConciliacao.ts` e `SaldoBancosDetailModal.tsx`)

- [x] [FRONTEND] Atualizar `SaldoBancosDetailModal.tsx` com fallback defensivo: `saldo_banco_ofx ?? saldo_banco_itau ?? saldo_banco`, cálculo exato de `saldoConsolidado = saldoOfx + dinheiroLoja + maquininhaNaoEntrou`, e suporte a status `em_transito` / `pending`

- [x] [TEST] Diagnóstico executado e validado: saldos OFX, dinheiro acumulado de cofre (R$ 3.920,00) e estrutura de transações POS confirmados

- [x] [TEST] Visual QA executado via Playwright headless com sucesso: screenshot capturado comprovando 10 lojas com extrato OFX real, chips de dinheiro no cofre com botão "Dar Baixa", badges de status e soma de saldo consolidado exatos
