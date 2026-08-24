# Design: Correção do Motor de Importação e Blindagem de Contas a Pagar (268)

## Arquitetura Técnica

```
[Arquivos OFX + XLS + Rede] 
       │
       ▼
[CentralImportWizard.tsx]
       ├──> OFX: Extrai saldos finais bancários (positivos R$ 102.999,61, negativos R$ 39.498,51)
       │    └─> saldo_bancario = R$ 63.501,10 líquido
       │
       ├──> Contas a Pagar: Grava lote analítico com external_code != null
       │    └─> snapshot.contas_a_pagar = R$ 29.999,51 (Base Planilha)
       │
       ├──> POS Rede: Deduplica por (store_id, amount, target_date, nsu/tid)
       │    └─> Juros Rede = R$ 5.650,15 | Não Entrou = R$ 0,00
       │
       └──> Caixa Atual Líquido:
            Caixa = Saldo Positivo + MP + A Receber + Pátio - Negativo Itaú
                  = 102.999,61 + 13.278,00 + 10.694,50 + 88.212,39 - 39.498,51
                  = R$ 175.685,99
       │
       ▼
[RPC get_daily_reconciliation_summary]
       ├──> Base Planilha = snapshot.contas_a_pagar (R$ 29.999,51)
       ├──> Extras Manuais = SUM(daily_manual_bills WHERE external_code IS NULL) (R$ 10.070,00)
       ├──> Juros Rede = R$ 5.650,15
       ├──> Subtotal Contas = R$ 45.719,66
       ├──> Valor Disp. Contas = Faturamento R$ 70.811,56 - Fluxo R$ 25.085,70 = R$ 45.725,86
       └──> Diferença Final = +R$ 6,20 (Aprovado / Conforme)
```

## Modificações nos Módulos

### 1. `supabase/migrations/20260824000003_filter_manual_bills_by_null_external_code.sql`
- Ajustar `get_daily_reconciliation_summary`:
  ```sql
  SELECT 
      COALESCE(SUM(amount), 0),
      COALESCE(jsonb_agg(jsonb_build_object(
          'id', id,
          'title', title,
          'description', description,
          'category', category,
          'amount', amount,
          'store_id', store_id,
          'created_at', created_at
      )), '[]'::jsonb)
  INTO 
      v_contas_extras,
      v_contas_itens
  FROM daily_manual_bills
  WHERE date = v_target_date AND external_code IS NULL;
  ```

### 2. `src/components/importacoes/CentralImportWizard.tsx`
- Corrigir cálculo de `saldoNegativoItau`, `saldoBancarioLiquido` e `caixaAtualCalculado` nas linhas 1133-1145 e 1245-1275:
  - Extrair os saldos de fechamento dos extratos bancários (não as entradas brutas `t.type === 'in'`).
  - Deduzir `saldoNegativoItau` no cálculo do `caixa_atual`.
  - Respeitar o `juros_rede` real e as OSs do pátio consolidadas.

### 3. Saneamento Imediato da Base (24/08)
- Deletar a duplicata de Santo André em `pos_transactions`.
- Inserir Pró-labore Daniel (R$ 10.070,00) em `daily_manual_bills` com `external_code: null`.
- Atualizar `daily_snapshots` para os valores periciais oficiais do dia 24/08.

## Cenários de Verificação
- **Cenário 1:** Chamada da RPC `get_daily_reconciliation_summary('2026-08-24')` retorna:
  - `contas_base: 29999.51`
  - `contas_extras: 10070.00`
  - `juros_rede: 5650.15`
  - `subtotal_contas: 45719.66`
  - `caixa_atual: 175685.99`
  - `diferenca_final: 6.20`
  - `status_geral: 'approved'`
- **Cenário 2:** Re-execução da importação no Wizard não infla o Caixa Atual nem duplica as contas a pagar.
