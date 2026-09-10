# Spec Plan: Equalização de Dinheiro em Cofre/MP e Correção da RPC de Resumo Diário (390)

## Tasks

- [x] [BACKEND] Atualizar registro de snapshot do dia `2026-09-09` em `daily_snapshots` com os dados auditados da planilha `CONCILIAÇÃO 0909.xlsx` (Caixa Atual R$ 357.012,80, Dinheiro MP R$ 30.920,00, Dinheiro Lojas R$ 3.720,00, Contas R$ 57.408,52, Diferença R$ 258,02)
- [x] [BACKEND] Criar e aplicar migration SQL `20260910000043_fix_summary_rpc_cash_vault_and_excel_alignment.sql` para garantir que `get_daily_reconciliation_summary` some o dinheiro em cofre ativo e respeite a equação contábil exata da planilha
- [x] [BACKEND] Sincronizar abertura do dia `2026-09-10` garantindo que `caixa_anterior` aponte para R$ 357.012,80
- [x] [TEST] Executar teste de carga da RPC para `2026-09-09` e validar matematicamente os 5 pilares, faturamento, contas e diferença de R$ 258,02
- [x] [TEST] Executar teste de carga da RPC para `2026-09-10` e validar herança do caixa anterior e integridade das 10 filiais
