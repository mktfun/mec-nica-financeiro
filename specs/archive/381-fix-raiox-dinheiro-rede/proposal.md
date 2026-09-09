# Proposal: Fix Raio-X de Saldos Bancários — Restauração de Dinheiro & Rede Pendente (381)

## Problema

A tela **"Raio-X de Saldos Bancários & Dinheiro por Filial"** (`SaldoBancosDetailModal.tsx`) está completamente quebrada: as colunas "Dinheiro no Cofre / Loja", "Maquininhas (Rede)" e "Extrato OFX (Itaú)" mostram `R$ 0,00` ou traço (`-`) para todas as 10 filiais, quando os dados reais estão presentes no banco de dados.

**Causa Raiz Confirmada:** A migration `20260908000036_fix_store_canonical_matching_and_anti_hijack.sql` regrediu a RPC `get_daily_reconciliation_summary` ao reescrevê-la, **removendo 5 campos críticos** que a migration canônica anterior (`20260904000036`) fornecia corretamente.

## Evidência Forense (Diagnóstico Real via RPC 2026-09-08)

| Campo | Esperado pelo Frontend | Retornado pela RPC | Resultado |
|-------|------------------------|-------------------|-----------|
| `saldo_banco_ofx` | `Number(s.saldo_banco_ofx)` | `undefined` (retorna `saldo_banco`) | **OFX zera** |
| `nao_entrou_valor` | `Number(s.nao_entrou_valor)` | `undefined` (campo omitido) | **Maquininhas zera** |
| `status_compensacao` | `s.status_compensacao` | `undefined` (campo omitido) | **Status quebra** |
| `vault_entries` | `s.vault_entries` | `undefined` (campo omitido) | **Cofre sem detalhe** |
| `dinheiro_loja` | `Number(s.dinheiro_loja)` | ✅ Funciona parcialmente | Cofre parcial OK |

### Dados Reais no Banco (2026-09-08):
- **store_cash_vault:** 4 registros `em_transito` = R$ 3.920 total (CAP R$200, DHJV R$220, HD R$3.000, JAB R$500)
- **pos_transactions:** 12 vendas = R$ 25.930,23 — **PORÉM todas com `settlement_status = 'entrou'`** (nenhuma "não entrou")
- **reconciliations:** 10 filiais com `bank_total` corretos (incluindo negativo de Mauá)

### Defeitos Cumulativos na Migration 20260908000036:

1. **CTE `rede_agg`:** Não calcula `nao_entrou_valor` (filtro `settlement_status IN ('nao_entrou', 'a_compensar')` foi removido)
2. **CTE `vault_agg`:** Filtro temporal errado — usa `entry_date = v_target_date` (igualdade exata) em vez de `entry_date <= v_target_date AND status IN ('em_transito', 'pending')` (acumulado pendente)
3. **`jsonb_build_object` por loja:** Omite `saldo_banco_ofx`, `nao_entrou_valor`, `status_compensacao`, `vault_entries`
4. **Pilar global `v_dinheiro_lojas`:** Mesmo filtro temporal quebrado (linha 1261)
5. **Pilar global `v_cartoes_a_compensar`:** Soma TODOS os `net_amount` da Rede (sem filtrar `settlement_status`), inflando o total de cartões a compensar

## Solução Proposta (Foco em Reuso e Correção)

### Estratégia: Restaurar o contrato canônico da migration `20260904000036` dentro da migration mais recente

Em vez de criar uma nova RPC, vamos criar uma **nova migration corretiva** (`20260909000040_fix_raiox_restore_dinheiro_rede.sql`) que:

1. **Restaura os campos omitidos** no `jsonb_build_object` de cada loja
2. **Corrige o CTE `vault_agg`** para usar filtro temporal acumulativo
3. **Restaura o CTE `rede_agg`** com cálculo de `nao_entrou_valor` 
4. **Corrige o pilar global** de dinheiro em lojas e cartões a compensar
5. **Adiciona fallbacks defensivos** no frontend para blindar contra regressões futuras

### Investigação e Análise de Reuso (Relatório dos Subagentes)

- **RPC existente `get_daily_reconciliation_summary`:** Será corrigida via `CREATE OR REPLACE FUNCTION` — reutilizando 100% da estrutura da migration 20260904000036 como referência canônica
- **Componente `SaldoBancosDetailModal.tsx`:** Já existe e funciona corretamente se receber os campos esperados — apenas precisa de fallbacks defensivos
- **Tabelas:** `store_cash_vault`, `pos_transactions`, `reconciliations` — dados íntegros, zero alteração de schema

## Contratos de Dados & SQL (Supabase)

### Migration: `20260909000040_fix_raiox_restore_dinheiro_rede.sql`

**CTE `rede_agg` — Restaurar `nao_entrou_valor`:**
```sql
rede_agg AS (
    SELECT 
        TRIM(store_id::text) as store_id,
        COALESCE(SUM(gross_amount), 0) as rede_bruto,
        COALESCE(SUM(net_amount), 0) as rede_liquido,
        COALESCE(SUM(fee_amount), 0) as rede_taxas,
        COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0) as rede_devolucoes,
        COALESCE(SUM(CASE WHEN settlement_status IN ('nao_entrou', 'a_compensar') THEN net_amount ELSE 0 END), 0) as nao_entrou_valor,
        COALESCE(SUM(CASE WHEN settlement_status = 'entrou' THEN net_amount ELSE 0 END), 0) as entrou_valor
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date
    GROUP BY TRIM(store_id::text)
)
```

**CTE `vault_agg` — Restaurar filtro temporal acumulativo:**
```sql
vault_agg AS (
    SELECT 
        TRIM(store_id::text) as store_id,
        COALESCE(SUM(amount), 0) as vault_total,
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id, 'amount', amount, 'entry_date', entry_date,
            'status', status, 'description', description, 'os_number_ref', os_number_ref
        )), '[]'::jsonb) as vault_entries
    FROM store_cash_vault
    WHERE status IN ('em_transito', 'pending')
      AND entry_date <= v_target_date::date
    GROUP BY TRIM(store_id::text)
)
```

**`jsonb_build_object` por loja — Restaurar campos omitidos:**
```sql
'saldo_banco_ofx', COALESCE(rt.bank_total, rl.bank_total, 0),
'nao_entrou_valor', COALESCE(rd.nao_entrou_valor, 0),
'entrou_valor', COALESCE(rd.entrou_valor, 0),
'status_compensacao', CASE WHEN COALESCE(rd.nao_entrou_valor, 0) > 0 THEN 'nao_entrou' ELSE 'entrou' END,
'vault_entries', COALESCE(v.vault_entries, '[]'::jsonb),
```

**Pilar global — Corrigir dinheiro e cartões:**
```sql
-- Dinheiro em lojas (acumulado em trânsito)
SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
FROM store_cash_vault
WHERE status IN ('em_transito', 'pending')
  AND entry_date <= v_target_date::date;

-- Cartões a compensar (APENAS não entrou)
SELECT 
    COALESCE(SUM(CASE WHEN settlement_status IN ('nao_entrou', 'a_compensar') THEN net_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0)
INTO v_cartoes_a_compensar, v_devolucoes_rede
FROM pos_transactions
WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;
```

## API & Componentes (Frontend)

### [MODIFY] `SaldoBancosDetailModal.tsx` — Fallbacks Defensivos

Adicionar fallbacks para evitar que regressões futuras na RPC zerem a tela:

```typescript
const saldoOfxPuro = Number(s.saldo_banco_ofx ?? s.saldo_banco_itau ?? s.saldo_banco ?? 0);
const maquininhaNaoEntrou = Number(s.nao_entrou_valor ?? 0);
```

## Risco Principal e Mitigação

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Colisão com match de Rede/OFX já rodado | Média | O `settlement_status` precisa ser definido ANTES de consultar a RPC. Se todas as `pos_transactions` estão `entrou`, a coluna de maquininhas ficará zerada mesmo com a correção da RPC. **O match de settlement_status é definido na importação da Rede ou via `auto_match_daily_transactions`.** |
| Dupla contagem de cartões no Pilar 1 | Baixa | A correção filtra estritamente por `settlement_status IN ('nao_entrou', 'a_compensar')` |
| Regressão futura por nova reescrita da RPC | Média | Fallbacks defensivos no frontend e regra na memória Obsidian |

> **Nota sobre o match de maquininhas:** Todas as 12 `pos_transactions` de 2026-09-08 têm `settlement_status = 'entrou'`. Isso significa que o **match entre OFX e Rede já classificou corretamente** que essas vendas entraram no banco. Para o dia 09/09, se ainda não houve importação dos dados de Rede com o settlement_status correto, a coluna ficará zerada. A importação do relatório Rede do dia (disponível em `C:\Users\admin\Desktop\conciliacao\09-26\09-09\Rede_*.xlsx`) precisa classificar o settlement_status durante a ingestão.
