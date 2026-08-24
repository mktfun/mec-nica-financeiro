# Spec Plan: Correção da Duplicação de Contas a Pagar e Alinhamento Preciso do Fechamento 24/08 (Spec 278)

## Tasks

- [ ] [BACKEND] Criar migração SQL `20260824000008_fix_contas_duplication_and_forensic_reconciliation.sql`:
  - Corrigir a RPC `get_daily_reconciliation_summary` para eliminar a duplicação entre `contas_base` (snapshot) e `contas_extras` (daily_manual_bills)
  - Inserir a despesa de Pró-labore do Daniel (R$ 10.070,00) em `daily_manual_bills`
  - Inserir os ajustes de Sucata (R$ 60 HD + R$ 30 JB = R$ 90) em `daily_revenue_adjustments`
  - Sincronizar o Pátio com as 28 OSs em aberto totalizando canonicamente R$ 88.212,39
  - Ajustar `juros_rede` para R$ 5.650,15 no snapshot
- [ ] [BACKEND] Aplicar a migração no Supabase e auditar via RPC:
  - `Caixa Atual` = R$ 175.685,99
  - `Fluxo de Caixa` = +R$ 25.085,70
  - `Faturamento Atual` = R$ 70.811,56
  - `Valor Disp. Contas` = R$ 45.725,86
  - `Subtotal Contas` = R$ 45.719,66
  - `Diferença Final` = +R$ 6,20 (Conciliado / Approved)
- [ ] [TEST] Executar `npm run build` e validar compilação com zero erros
