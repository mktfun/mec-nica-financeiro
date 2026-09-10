# Proposal: Equalização de Dinheiro em Cofre/MP e Correção da RPC de Resumo Diário (390)

## Problema
1. **Diferença Travada em ~R$ 9.888,05:** A RPC `get_daily_reconciliation_summary` para a data `2026-09-09` está retornando `diferenca_final = 9888.05`, pois a tabela `daily_snapshots` continha um snapshot com status `is_closed: true` congelando `caixa_atual = 345331.33` (valor defasado pré-conciliação), enquanto na planilha oficial `CONCILIAÇÃO 0909.xlsx` o Caixa Atual consolidado é **R$ 357.012,80**.
2. **Dinheiro em Lojas e MP Não Integrado:** A RPC estava reportando `dinheiro_lojas = 0`, ignorando os **R$ 3.720,00** em dinheiro no cofre em trânsito (Jorge Beretta R$ 220, Santo André R$ 3.000, Jabaquara R$ 500) e divergindo no `dinheiro_mp` (estava R$ 34.340,00 no banco, enquanto na planilha célula `G4` é **R$ 30.920,00**).
3. **Subtotal de Contas Desalinhado:** A RPC acumulava contas em `59.459,96`, enquanto o subtotal auditado na planilha oficial (`G21 = SUM(G43:G47)`) é **R$ 57.408,52** (Contas R$ 54.851,02 + Juros Atual R$ 2.304,47 + Diferença HD R$ 253,03).
4. **Diferença Real no Excel:** A diferença contábil legítima calculada no Excel é de apenas **R$ 258,02** (`Valor Disponível R$ 57.666,54 - Contas R$ 57.408,52`).

## Solução Proposta (Foco em Reuso e Correção)
Reutilizar e calibrar as estruturas existentes sem criar novas tabelas ou RPCs paralelas:
1. **[MODIFY] Tabela `daily_snapshots` (2026-09-09):**
   - Atualizar os campos canônicos com a verdade da planilha `CONCILIAÇÃO 0909.xlsx`:
     - `saldo_bancario`: R$ 245.238,24
     - `saldo_negativo_itau`: R$ 11.912,91
     - `dinheiro_mp`: R$ 30.920,00
     - `dinheiro_em_lojas`: R$ 3.720,00
     - `a_receber_manual`: R$ 6.929,67
     - `total_patio`: R$ 70.204,89
     - `caixa_atual`: R$ 357.012,80
     - `faturamento`: R$ 65.230,73 (Base R$ 64.930,73 + Ajustes/Limpa Baú R$ 300,00)
     - `contas_a_pagar`: R$ 57.408,52
     - `juros_rede`: R$ 2.304,47
     - `metadata`: registrar subtotal de contas auditado, status e a diferença de R$ 258,02.
2. **[MODIFY] RPC `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean)`:**
   - Garantir que `v_dinheiro_lojas` seja computado ativamente a partir de `store_cash_vault` para todas as entradas em trânsito/pendentes até a data (`status IN ('em_transito', 'pending') AND entry_date <= v_target_date::date`).
   - Integrar o dinheiro em cofre de cada filial no `saldo_bancos_positivo` ou na composição da tesouraria, espelhando a fórmula canônica do Excel `SUM(bancos_positivos + dinheiros_cofre)`.
   - Garantir que, mesmo em snapshots fechados, se houver atualização de saldos auditados ou recálculo, a RPC respeite a equação contábil exata da planilha.
3. **[MODIFY] Propagação para 2026-09-10:**
   - Garantir que `caixa_anterior` de 10/09 reflita os **R$ 357.012,80** e que os saldos de abertura das 10 filiais permaneçam idênticos aos de fechamento de 09/09.

## Investigação e Análise de Reuso (Relatório de Conformidade)
- **Tabelas Existentes:** `daily_snapshots`, `store_cash_vault`, `reconciliations`, `daily_manual_bills`, `pos_transactions`. Nenhuma tabela nova será criada.
- **RPC Existente:** `get_daily_reconciliation_summary(text, boolean)` já possui toda a infraestrutura para retornar os 5 pilares, bicanalidade e breakdown por loja.
- **Frontend Existente:** `SaldoBancosDetailModal.tsx` e `ResumoDiaPanel.tsx` já consomem `get_daily_reconciliation_summary`. Nenhuma mudança de contrato de tipos é necessária.

## Contratos de Dados & SQL (Supabase)
```sql
-- Atualização do snapshot canônico 09/09/2026
UPDATE daily_snapshots
SET 
  caixa_atual = 357012.80,
  dinheiro_mp = 30920.00,
  dinheiro_em_lojas = 3720.00,
  a_receber_manual = 6929.67,
  total_patio = 70204.89,
  saldo_bancario = 245238.24,
  saldo_negativo_itau = 11912.91,
  faturamento = 65230.73,
  contas_a_pagar = 57408.52,
  juros_rede = 2304.47,
  is_closed = true,
  metadata = jsonb_build_object(
    'faturamento_oi_base', 64930.73,
    'faturamento_ajustes', 300.00,
    'subtotal_contas', 57408.52,
    'contas_base', 54851.02,
    'juros_rede', 2304.47,
    'diferenca_hd', 253.03,
    'diferenca_final', 258.02,
    'status_geral', 'approved'
  )
WHERE date = '2026-09-09'::date;
```

## Risco Principal e Mitigação
- **Risco:** Regressão nos cálculos dinâmicos quando `p_force_dynamic = true` ou em datas anteriores.
- **Mitigação:** Isolar a regra no PostgreSQL garantindo que as fórmulas matemáticas respeitem a equação universal:
  `Caixa Atual = (Saldos Positivos + Dinheiro Cofre + Dinheiro MP + A Receber + Pátio) - Saldo Negativo Cheque Especial`.
