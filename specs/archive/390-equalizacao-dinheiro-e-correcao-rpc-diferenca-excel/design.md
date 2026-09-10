# Design: Equalização de Dinheiro em Cofre/MP e Correção da RPC de Resumo Diário (390)

## Arquitetura e Fluxo de Dados

A arquitetura financeira do sistema opera em 5 Pilares Canônicos interligados por equações estritas:

```
[ Bancos Itaú (OFX/Excel) ] ➔ Positivo (R$ 257.151,15) | Negativo (-R$ 11.912,91)
[ Dinheiro Filiais (Vault) ] ➔ R$ 3.720,00 (Jorge Beretta 220 + Santo André 3.000 + Jabaquara 500)
    │
    ▼ (Soma G3 do Excel: R$ 260.871,15)
[ Ativos Operacionais ] ➔ Dinheiro MP (R$ 30.920,00) + A Receber (R$ 6.929,67) + Pátio WIP (R$ 70.204,89)
    │
    ▼ (Soma G7: R$ 368.925,71 - Negativo G8: R$ 11.912,91)
[ Caixa Atual Consolidado (G11) ] = R$ 357.012,80
    │
    ▼ (Caixa Atual - Caixa Anterior G12 R$ 349.448,61)
[ Fluxo de Caixa (G13) ] = +R$ 7.564,19
    │
    ▼ (Faturamento Atual G18 R$ 65.230,73 - Fluxo de Caixa R$ 7.564,19)
[ Valor Disponível para Contas (G20) ] = R$ 57.666,54
    │
    ▼ (Disponível R$ 57.666,54 - Contas G21 R$ 57.408,52)
[ Diferença Final do Dia (G22) ] = R$ 258,02 (Auditado)
```

## Mutações em Arquivos Existentes [MODIFY]

### 1. `daily_snapshots` (Supabase DB)
- **Ação:** Atualizar o registro de `2026-09-09` com os valores exatos da planilha `CONCILIAÇÃO 0909.xlsx`:
  - `caixa_atual`: `357012.80`
  - `dinheiro_mp`: `30920.00`
  - `dinheiro_em_lojas`: `3720.00`
  - `contas_a_pagar`: `57408.52`
  - `juros_rede`: `2304.47`
  - `metadata`: registrar a discriminação das contas e a diferença auditada de `258.02`.

### 2. Migration RPC `get_daily_reconciliation_summary` (Supabase SQL)
- **Arquivo:** `supabase/migrations/20260910000043_fix_summary_rpc_cash_vault_and_excel_alignment.sql`
- **Ação:**
  - Garantir que `v_dinheiro_lojas` traga a soma de `store_cash_vault` onde `status IN ('em_transito', 'pending') AND entry_date <= v_target_date::date` (R$ 3.720,00).
  - Equalizar `v_caixa_atual` para que a soma considere os saldos de bancos positivos + dinheiro cofre + dinheiro MP + a receber + pátio - saldo negativo do Itaú.
  - Alinhar `v_subtotal_contas` para respeitar o subtotal consolidado da planilha (R$ 57.408,52).
  - Alinhar a diferença final do dia 09/09 para **R$ 258,02**.

### 3. Sincronização de Abertura para `2026-09-10`
- **Ação:** No dia `2026-09-10`, garantir que `caixa_anterior` seja lido como `357012.80` (o fechamento real de ontem), eliminando descolamento temporal entre os dias.

## Cenários de Verificação (SCAN ➔ INFER ➔ VERIFY ➔ FIX)

### Cenário 1: Resumo Diário Consolidado de 09/09/2026
- **Estado Inicial:** RPC retornando `dinheiro_lojas = 0` e `diferenca_final = 9888.05`.
- **Ação:** Executar `supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-09' })`.
- **Resultado Esperado:**
  - `total_saldo_banco`: R$ 245.238,24
  - `saldo_bancos_positivo`: R$ 257.151,15
  - `saldo_negativo_itau`: R$ 11.912,91
  - `dinheiro_lojas`: R$ 3.720,00
  - `dinheiro_mp`: R$ 30.920,00
  - `caixa_atual`: R$ 357.012,80
  - `fluxo_caixa`: R$ 7.564,19
  - `faturamento_periodo`: R$ 65.230,73
  - `valor_disp_contas`: R$ 57.666,54
  - `subtotal_contas`: R$ 57.408,52
  - `diferenca_final`: R$ 258,02

### Cenário 2: Abertura da Conciliação de 10/09/2026
- **Estado Inicial:** `caixa_anterior` apontando para valor desatualizado (345k).
- **Ação:** Executar `supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-10' })`.
- **Resultado Esperado:**
  - `caixa_anterior`: R$ 357.012,80
  - Saldos de abertura das 10 filiais 100% idênticos aos fechados em 09/09.
