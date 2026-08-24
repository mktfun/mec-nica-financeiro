# Spec Plan: Ajuste Matemático Estrito da RPC de Conciliação (Spec 273)

## Tasks

- [x] [BACKEND] Criar migração SQL `20260824000005_fix_math_caixa_atual_and_saldo_total.sql` ajustando a RPC `get_daily_reconciliation_summary` para calcular `v_total_saldo_banco` (OFX + Cofre + Maquininhas) e `v_caixa_atual` somando os 4 pilares completos
- [x] [BACKEND] Aplicar a migração no Supabase e validar que a RPC retorna `total_saldo_banco: 63.301,10` e `caixa_atual: 178.467,26`
- [x] [FRONTEND] Ajustar `ResumoDiaPanel.tsx` para renderizar `summary.total_saldo_banco` no valor principal do Card 1
- [x] [TEST] Executar `npm run build` e validar compilação com zero erros
