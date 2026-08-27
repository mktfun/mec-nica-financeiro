# Spec Plan: Correcao do Card Faturamento do Dia (303)

## Tasks

- [x] [BACKEND] Atualizar RPC `get_daily_reconciliation_summary` no Ramal 1 para buscar `v_faturamento_anterior`, calcular `v_faturamento_oi_base` (Hoje - Ontem) e retornar `faturamento_periodo` e `faturamento_anterior`
- [x] [BACKEND] Hotfix de dados: atualizar snapshot de 27/08 com `faturamento_oi_base = 23792.80`, `faturamento_periodo = 23792.80`, `faturamento_anterior = 867870.82`
- [x] [FRONTEND] Ajustar `ResumoDiaPanel.tsx` para garantir que o Card "Faturamento do Dia" exiba o valor liquido do dia (`R$ 23.792,80`), mantendo o calculo instantaneo de odometro no input de edicao
- [x] [TEST] Verificar que a RPC para 27/08 retorna `faturamento_periodo = 23792.80` e `faturamento_anterior = 867870.82`
- [x] [TEST] Verificar que a RPC para 26/08 permanece correta com `faturamento_periodo = 29046.09`
- [x] [TEST] Executar `npm run build` com sucesso
