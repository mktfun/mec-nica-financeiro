# Design: Fix de Devoluções da Rede e Janela Temporal de OS no Pátio (Spec 240)

## Arquitetura Técnica — Fluxo de Dados Ponta a Ponta

```
[Fix 1 — Devoluções Rede]
  Arquivo Rede (.xls) → useCentralImport.ts (parser)
    → detecta net_amount < 0 OU label DEVOLUCAO/ESTORNO
    → INSERT pos_transactions com transaction_type = 'devolucao'
    → RPC get_store_pos_triple_reconciliation:
        • SUM(net_amount) WHERE transaction_type = 'venda' → total_rede_liquido
        • SUM(net_amount) WHERE transaction_type = 'devolucao' → total_devolucoes
    → RPC get_daily_reconciliation_summary:
        • total_devolucoes → somado a v_subtotal_contas (Conta a Pagar)
        • Pilar 1: NÃO inclui devoluções no total_nao_entrou
        • Pilar 5: exibe devolucoes_rede como sub-linha

[Fix 2 — Âncora Temporal]
  Import de OS → useImportProcessor.ts → savePatioOsAndReceivables()
    → se delta_paid > 0: grava last_payment_date = targetDate
    → patio_os.last_payment_date = '2026-08-19'
    → RPC get_daily_reconciliation_summary(p_date = '2026-08-18'):
        • CTE patio_store: effective_paid_value = CASE WHEN last_payment_date <= '2026-08-18' THEN paid_value ELSE 0 END
        • Resultado: OS não aparece como paga no dia 18/08 ✅
```

---

## Interfaces TypeScript

```typescript
// useBackendConciliacao.ts — campos adicionados
interface DailyReconciliationSummary {
  // ... campos existentes ...
  devolucoes_rede: number;       // NOVO: soma de devoluções da maquininha
  subtotal_contas: number;       // AGORA inclui devolucoes_rede
}

interface PosTripleReconciliationResult {
  // ... campos existentes ...
  total_devolucoes: number;      // NOVO: total de estornos/chargebacks
}

// pos_transactions type (Supabase types.ts)
interface PosTransaction {
  // ... campos existentes ...
  transaction_type: 'venda' | 'devolucao';  // NOVO
}

// patio_os type (Supabase types.ts)
interface PatioOs {
  // ... campos existentes ...
  last_payment_date: string | null;  // NOVO: date ISO
}
```

---

## Componentes / Hooks / Funções

| Artefato | Localização | Mudança |
|---|---|---|
| Migration `20260819000000_fix_devolucoes_rede_temporal.sql` | `supabase/migrations/` | **NOVO** — adiciona `transaction_type` em `pos_transactions` e `last_payment_date` em `patio_os` |
| Migration `20260819000001_fix_rpcs_devolucoes_temporal.sql` | `supabase/migrations/` | **NOVO** — reescreve `get_store_pos_triple_reconciliation` e `get_daily_reconciliation_summary` |
| `savePatioOsAndReceivables()` | `src/hooks/useImportProcessor.ts:35` | **MODIFY** — adiciona `last_payment_date: targetDate` no payload quando `delta_paid > 0` |
| `useCentralImport.ts` | `src/hooks/useCentralImport.ts` | **MODIFY** — detectar devoluções Rede e gravar `transaction_type` |
| `useBackendConciliacao.ts` | `src/hooks/useBackendConciliacao.ts` | **MODIFY** — adicionar `devolucoes_rede` e `total_devolucoes` nos tipos |
| `ResumoDiaPanel.tsx` | `src/components/conciliacao/ResumoDiaPanel.tsx` | **MODIFY** — sub-linha `Devoluções REDE` no Pilar 5 |
| `MaquininhasDetailModal.tsx` | `src/components/conciliacao/MaquininhasDetailModal.tsx` | **MODIFY** — KPI `total_devolucoes` |

---

## SQL das Migrations

### Migration 1 — Schema
```sql
-- 20260819000000_fix_devolucoes_rede_temporal.sql

-- Fix 1: Coluna de tipo de transação na maquininha
ALTER TABLE public.pos_transactions
  ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'venda'
  CHECK (transaction_type IN ('venda', 'devolucao'));

-- Fix 2: Âncora temporal para pagamentos de OS
ALTER TABLE public.patio_os
  ADD COLUMN IF NOT EXISTS last_payment_date date;

-- Índice para performance da CTE patio_store
CREATE INDEX IF NOT EXISTS idx_patio_os_last_payment_date
  ON public.patio_os (last_payment_date);
```

### Migration 2 — RPCs (esqueleto lógico)
```sql
-- get_store_pos_triple_reconciliation — filtro de devoluções
-- CTE rede_store:
SELECT store_id,
  SUM(CASE WHEN transaction_type = 'venda' THEN net_amount ELSE 0 END) as rede_liquido,
  SUM(CASE WHEN transaction_type = 'devolucao' THEN ABS(net_amount) ELSE 0 END) as devolucoes
FROM pos_transactions WHERE target_date = p_date
GROUP BY store_id

-- get_daily_reconciliation_summary — paid_value com âncora temporal
-- CTE patio_store:
COALESCE(total_value, 0) -
CASE WHEN last_payment_date IS NULL OR last_payment_date <= p_date
     THEN COALESCE(paid_value, 0)
     ELSE 0
END AS pending_value

-- v_subtotal_contas inclui devoluções:
v_subtotal_contas := v_juros_rede + v_contas_manual + v_devolucoes_rede;
```

---

## Fluxo de UI

### Pilar 5 — Contas do Dia (ResumoDiaPanel.tsx)
Antes:
```
CONTAS DO DIA
R$ 12.500,00
  Juros: R$ 450,00
  Saídas OFX: - R$ 12.050,00
```

Depois:
```
CONTAS DO DIA
R$ 13.800,00
  Juros: R$ 450,00
  Saídas OFX: - R$ 12.050,00
  Devoluções REDE: - R$ 1.300,00   ← NOVO (rose/red)
```

### Modal Maquininhas (MaquininhasDetailModal.tsx)
4 KPIs atuais → 5 KPIs após fix:
- Vendas Rede (Líquido)
- Taxas MDR
- Creditado no OFX
- A Compensar
- **Devoluções (Estorno)** ← NOVO, cor rose-400

---

## Cenários de Verificação

- **Cenário 1 (Bug 1):** Importar extrato Rede com 1 devolução de R$ 500,00 → `total_devolucoes = 500`, `total_nao_entrou` não inclui R$ 500, Pilar 5 exibe "Devoluções REDE: - R$ 500,00".
- **Cenário 2 (Bug 2):** OS com `total_value = 1000`, `paid_value = 0` aberta em 18/08. Em 19/08 paga R$ 600 → `last_payment_date = 19/08/2026`. Consultar conciliação de 18/08 → OS aparece com saldo pendente R$ 1.000 (sem deduzir os R$ 600 pagos em 19/08). Consultar 19/08 → OS aparece com saldo R$ 400.
- **Cenário 3 (Regressão):** OSs existentes sem `last_payment_date` (NULL) → RPC usa `paid_value` atual, comportamento idêntico ao atual. Zero regressão.
- **Cenário 4 (Nenhuma devolução):** Dia sem transações `transaction_type = 'devolucao'` → `devolucoes_rede = 0`, sub-linha oculta no Pilar 5.
