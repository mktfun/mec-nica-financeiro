# Design: Fix Raio-X de Saldos Bancários (381)

## Arquitetura e Fluxo de Dados

```
SaldoBancosDetailModal.tsx
  ├── Recebe `stores` de ResumoDiaPanel (prop)
  │     └── summary.stores (via useDailyReconciliationSummary hook)
  │           └── RPC get_daily_reconciliation_summary(p_date)
  │                 ├── CTE rede_agg → pos_transactions → nao_entrou_valor ❌ MISSING
  │                 ├── CTE vault_agg → store_cash_vault → vault_total, vault_entries ⚠️ WRONG FILTER
  │                 ├── CTE recon_today → reconciliations → bank_total
  │                 └── jsonb_build_object → saldo_banco_ofx ❌ MISSING
  └── Fallback via RPC direta (se stores vazio)
        └── get_daily_reconciliation_summary(p_date) → mesma RPC
```

## Interfaces TypeScript (Sem Alteração — Já Existem)

```typescript
// src/hooks/useBackendConciliacao.ts (L81-112)
export interface StoreReconciliationSummary {
  store_id: string;
  store_name: string;
  saldo_banco: number;
  saldo_banco_ofx?: number;      // ← Campo que a RPC deve retornar
  dinheiro_loja?: number;
  vault_entries?: Array<...>;     // ← Campo que a RPC deve retornar
  nao_entrou_valor?: number;      // ← Campo que a RPC deve retornar
  status_compensacao?: string;    // ← Campo que a RPC deve retornar
  maquininha: number;
  // ... demais campos já existentes
}
```

## Mutações em Arquivos Existentes [MODIFY]

### [NEW] `supabase/migrations/20260909000040_fix_raiox_restore_dinheiro_rede.sql`
- **DROP** e **CREATE OR REPLACE** da RPC `get_daily_reconciliation_summary`
- Baseada na migration canônica `20260904000036` como referência, incorporando as correções de matching da `20260908000036`
- Restaura os 5 campos omitidos no `jsonb_build_object` por loja
- Corrige CTE `vault_agg` (filtro temporal `<= date` + status `em_transito/pending`)
- Corrige CTE `rede_agg` (adiciona `nao_entrou_valor` e `entrou_valor`)
- Corrige pilares globais `v_dinheiro_lojas` e `v_cartoes_a_compensar`
- **Preserva** todas as correções de anti-hijack e matching da 20260908000036

### [MODIFY] `src/components/conciliacao/SaldoBancosDetailModal.tsx`
- Linha 54: Adicionar fallback `s.saldo_banco_ofx ?? s.saldo_banco_itau ?? s.saldo_banco`
- Nenhuma outra alteração visual necessária

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Dados de 2026-09-08 (Restauração Funcional)
- **Estado inicial:** RPC retorna `saldo_banco_ofx = undefined`, `nao_entrou_valor = undefined`
- **Ação:** Aplicar migration e rebuild
- **Resultado esperado:**
  - Coluna "Extrato OFX (Itaú)" mostra valores reais (ex: Beretta R$ 165.608,36)
  - Coluna "Dinheiro no Cofre / Loja" mostra R$ 3.920 total (CAP R$200, DHJV R$220, HD R$3.000, JAB R$500) com botão "Dar Baixa"
  - Coluna "Maquininhas (Rede)" mostra `-` (pois settlement_status = entrou para todas)
  - Cards superiores: Bancos Positivos = R$ 243.769,65, Dinheiro no Cofre = R$ 3.920, A Compensar = R$ 0

### Cenário 2: Dia sem dados de Rede importados (ex: 2026-09-09 antes da importação)
- **Estado inicial:** Sem pos_transactions para o dia
- **Ação:** Abrir modal
- **Resultado esperado:**
  - Coluna "Maquininhas (Rede)" mostra `-` para todas
  - Card "A Compensar" mostra R$ 0,00
  - Dinheiro acumulado de dias anteriores em trânsito continua aparecendo
