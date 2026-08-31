# Design: Correção do Caixa Atual, Fluxo Contábil e Paridade dos 5 Pilares na RPC de Conciliação (319)

## Arquitetura e Fluxo de Dados
Diagrama textual do fluxo ponta a ponta:
1. **Frontend (`ResumoDiaPanel.tsx`)** → Dispara `useDailyReconciliationSummary(selectedDate)`.
2. **Supabase RPC (`get_daily_reconciliation_summary`)**:
   - Apura os 4 pilares superiores de Ativos:
     - Pilar 1: `v_total_saldo_banco_positivo` ($244.127,24$) e `v_saldo_negativo_itau` ($30.628,21$)
     - Pilar 2: `v_dinheiro_mp` ($22.475,00$)
     - Pilar 3: `v_a_receber` ($8.049,67$)
     - Pilar 4: `v_na_loja_os` ($51.054,86$)
   - Computa:
     - $\text{Caixa Atual} = (244.127,24 + 22.475,00 + 8.049,67 + 51.054,86) - 30.628,21 = \mathbf{295.078,56}$
     - $\text{Fluxo de Caixa} = 295.078,56 - 292.628,15 = \mathbf{+2.450,41}$
     - $\text{Valor Disp. Contas} = 55.420,95 - 2.450,41 = \mathbf{52.970,54}$
     - $\text{Subtotal Contas} = 51.394,05 + 3.932,35 = \mathbf{55.326,40}$
     - $\text{Diferença Final} = 52.970,54 - 55.326,40 = \mathbf{-2.355,86}$
3. **Frontend (`ResumoDiaPanel.tsx`)** → Renderiza os cards com total coerência visual e matemática.
4. **Fechamento Diário (`handleSaveSnapshot`)** → Envia para `daily_snapshots` o `caixa_atual = 295078.56` e `total_patio = 51054.86`, mantendo o snapshot gravado 100% alinhado com a RPC.

## Mutações em Arquivos Existentes [MODIFY]
- `supabase/migrations/20260831000004_fix_patio_os_aggregation_and_cash_vault_baixa.sql` (ou nova migration `20260831000005_fix_caixa_atual_and_fluxo_contabil.sql`):
  - Recalcular determinística e compulsoriamente `v_caixa_atual`, `v_fluxo_caixa`, `v_valor_disp_contas` e `v_diferenca_final` em ambos os Ramais (1 e 2).
  - Atualizar o registro do snapshot de `31/08/2026` para `caixa_atual = 295078.56` e `total_patio = 51054.86`.
- `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - Garantir que o recálculo do Caixa Atual no frontend derive dinamicamente de `(totalSaldoBancoPositivo + dinheiroMpValor + aReceberValor + naLojaValor) - saldoNegativoItau`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Paridade no Painel de Conciliação)**:
  - SCAN: Carregar data `31/08/2026` na tela de conciliação.
  - INFER: Card Caixa Atual deve exibir exatamente **R$ 295.078,56** (igual à soma dos 4 pilares superiores menos o cheque especial).
  - VERIFY: Fluxo de Caixa exibe $+2.450,41$, Valor Disp. Contas exibe $52.970,54$.
- **Cenário 2 (Persistência no Snapshot)**:
  - SCAN: Salvar ou recarregar a tela.
  - INFER: O banco de dados retorna `caixa_atual: 295078.56` e `total_patio: 51054.86`.
  - VERIFY: Nenhuma divergência residual entre o cabeçalho e o fechamento contábil.
