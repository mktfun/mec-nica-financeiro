# Proposal: Conciliação Canônica Pericial de 01/09/2026 (342)

## Problema
O operador precisa realizar a conciliação diária de **01/09/2026** refletindo exatamente os dados da planilha oficial auditada `CONCILIAÇÃO 0109.xlsx` e dos arquivos brutos em `C:\Users\admin\Desktop\conciliacao\01-09`, sem a necessidade de cadastrar manualmente dezenas de OSs uma a uma.
Atualmente, no banco de dados para a data 2026-09-01:
- As 54 Ordens de Serviço do pátio (R$ 57.780,63) precisam estar saneadas e associadas às respectivas filiais.
- O Faturamento Base da Oficina Inteligente (R$ 54.853,00) somado às 3 entradas corporativas/financeiras justificadas no DRE (Venda de Juros Mauá R$ 1.062,61 + Empréstimo Capital de Giro Kennedy R$ 100.000,00 + Devolução de Seguro Santo André R$ 11.208,87) totaliza **R$ 167.124,48**.
- O Contas a Pagar totaliza **R$ 46.013,65** (Contas Base R$ 38.941,41 + Juros Rede R$ 2.901,24 + Pró-labore Daniel R$ 20,00 + Pró-labore Henrique R$ 4.151,00).
- Os Saldos Bancários (10 contas Itaú) somam **R$ 336.101,40** em contas positivas e **-R$ 10.431,97** em Cheque Especial (Planalto).
- O Dinheiro em Cofre (Pilar 2) totaliza **R$ 24.955,00** e os Recebíveis (Pilar 3) totalizam **R$ 8.049,67** (Brasicar Gestauto R$ 1.120,00 + Mauá Orion R$ 6.929,67).
- O Caixa Atual totaliza **R$ 416.454,73**, com Fluxo de Caixa de **R$ 121.110,71** e Diferença Final de **+R$ 0,12 (Sobra Aprovada de 12 centavos)**.

## Solução Proposta (Foco em Reuso e Equalização Pericial)
1. **[BACKEND] Migration / Script Canônico de 01/09/2026**:
   - Sincronizar as 54 Ordens de Serviço em `patio_os` para a data 2026-09-01, com suas formas de pagamento e saldos em aberto exatos conforme a aba `OS` do Excel oficial (R$ 57.780,63).
   - Registrar as despesas manuais do dia em `daily_manual_bills` (Juros Rede R$ 2.901,24, Pró-labore Daniel R$ 20,00, Pró-labore Henrique R$ 4.151,00) e as contas base em `BuscaContasAPagar.xls` (R$ 38.941,41).
   - Registrar os ajustes de faturamento em `daily_revenue_adjustments` ou via categorização em `ofx_transactions`:
     - `VENDA DE JUROS MHE`: R$ 1.062,61
     - `CAPITAL DE GIRO KENNEDY`: R$ 100.000,00
     - `DEVOLUÇÃO SEGURO EMPRÉSTIMO ITAU`: R$ 11.208,87
   - Garantir que o snapshot do dia 01/09/2026 em `daily_snapshots` contenha o odômetro inicial e final com faturamento base de R$ 54.853,00, caixa anterior de R$ 295.344,02, dinheiro MP de R$ 24.955,00 e A Receber de R$ 8.049,67.
2. **[FRONTEND] Zero Recálculo**:
   - Manter `ResumoDiaPanel.tsx`, `ConciliacaoLojasView.tsx` e `StoreCardModulo1.tsx` consumindo os valores retornados pela RPC `get_daily_reconciliation_summary`, exibindo a Diferença Final de **+R$ 0,12** com status de conciliação aprovada.

## Contratos de Dados & SQL (Supabase)
- **Tabela `daily_snapshots`**:
  - `target_date`: `'2026-09-01'`
  - `saldo_bancario`: `336101.40`
  - `saldo_negativo_itau`: `10431.97`
  - `dinheiro_mp`: `24955.00`
  - `a_receber_manual`: `8049.67`
  - `total_patio`: `57780.63`
  - `caixa_atual`: `416454.73`
  - `faturamento`: `167124.48`
  - `faturamento_oi_base`: `54853.00`
  - `contas_a_pagar`: `46013.65`
  - `diferenca_final`: `0.12`
  - `is_closed`: `false` (aberto para conferência do operador)
- **Tabela `daily_revenue_adjustments`**:
  - Inserção dos 3 créditos com flag `contabilizar_faturamento = true`.
- **Tabela `daily_manual_bills`**:
  - Inserção dos pró-labores e juros rede vinculados às filiais.

## Risco Principal e Mitigação
- **Risco:** Desbalancear o histórico de 31/08/2026 ao ajustar 01/09/2026.
- **Mitigação:** Isolar todas as operações estritamente para `target_date = '2026-09-01'`, preservando os registros e snapshots de 31/08 intactos (`caixa_anterior: 295.344,02`).
