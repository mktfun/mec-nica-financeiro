# Proposal: Fix de Devoluções da Rede e Janela Temporal de OS no Pátio (Spec 240)

## Problema

### Bug 1 — Devoluções/Estornos da Rede somados erroneamente como "A Compensar" (Pilar 1)

Quando a adquirente Rede processa um **estorno/chargeback/devolução**, a transação entra na tabela `pos_transactions` com `net_amount` potencialmente positivo (o sistema trata como uma "venda" normal). A RPC `get_store_pos_triple_reconciliation` soma **todos** os registros de `pos_transactions` para o `target_date`, incluindo devoluções, inflando o `total_rede_liquido` e por consequência o campo `total_nao_entrou` (A Compensar).

O resultado prático: devoluções de R$ X aparecem no **Pilar 1** como crédito a receber, quando na realidade representam uma **saída de caixa** (Conta a Pagar — o dinheiro precisa ser devolvido ao cliente).

**Causa Raiz:**
- A RPC de conciliação tripla não distingue `transaction_type = devolucao` em `pos_transactions`.
- Não há campo `transaction_type` ou equivalente para segregar devoluções de vendas.
- A lógica de `total_nao_entrou` assume que toda diferença `rede_liquido - ofx_maquininhas > 0` é crédito a receber.

---

### Bug 2 — Janela Temporal: pagamentos de OS de ontem vazam para dias futuros no "Na Loja OS"

A RPC `get_daily_reconciliation_summary` consulta `patio_os` com:

```sql
WHERE opened_at::date <= p_date
  AND LOWER(status) NOT IN ('finalizada', ...)
  AND ((total_value - paid_value) > 0 OR ...)
```

O problema: `paid_value` na tabela `patio_os` é **sempre o valor atual**, sem âncora temporal. Quando uma OS tem seu `paid_value` atualizado de R$ 0 para R$ 500 em 19/08, a consulta do dia **18/08** também lê `paid_value = 500`, distorcendo retroativamente o "Na Loja OS" de ontem.

**Causa Raiz:**
- `patio_os` não possui âncora de data para `paid_value`. O `history_log` existe mas não é consultado pela RPC.
- Pagamentos em dinheiro gravados hoje para OSs abertas ontem causam "time-travel" nos saldos históricos.

---

## Solução Proposta

### Fix 1 — Filtro de Devoluções na RPC `get_store_pos_triple_reconciliation`
1. Adicionar coluna `transaction_type text DEFAULT 'venda'` em `pos_transactions`.
2. No parser/importador da Rede (`useCentralImport.ts`): detectar registros com `net_amount < 0` ou label `DEVOLUCAO`/`ESTORNO`/`CHARGEBACK` e gravar com `transaction_type = 'devolucao'`.
3. Atualizar a RPC para excluir devoluções do `total_rede_liquido` e somar ao `v_subtotal_contas` em `get_daily_reconciliation_summary`.

### Fix 2 — Âncora Temporal para `paid_value` na CTE `patio_store`
1. Adicionar coluna `last_payment_date date` (nullable) em `patio_os`.
2. `savePatioOsAndReceivables` preenche `last_payment_date = targetDate` quando `delta_paid > 0`.
3. CTE `patio_store` usa `effective_paid_value`:
   ```sql
   CASE WHEN last_payment_date IS NULL OR last_payment_date <= p_date
        THEN COALESCE(paid_value, 0)
        ELSE 0
   END AS effective_paid_value
   ```

---

## Contratos de Dados

### `pos_transactions` — Nova Coluna
| Campo | Tipo | Default | Descrição |
|---|---|---|---|
| `transaction_type` | `text` | `'venda'` | `'venda'` ou `'devolucao'` |

### `patio_os` — Nova Coluna
| Campo | Tipo | Default | Descrição |
|---|---|---|---|
| `last_payment_date` | `date` | `NULL` | Data do último pagamento registrado |

### RPCs Modificadas
- `get_store_pos_triple_reconciliation(p_date date)` — filtro `transaction_type = 'venda'` + campo `total_devolucoes`
- `get_daily_reconciliation_summary(p_date date)` — `effective_paid_value` com âncora temporal + `devolucoes_rede` em `subtotal_contas`

---

## API / Interface

### Hooks Afetados
- `useImportProcessor.ts` → `savePatioOsAndReceivables()` preenche `last_payment_date`
- `useCentralImport.ts` → detecta e grava `transaction_type = 'devolucao'` em `pos_transactions`
- `useBackendConciliacao.ts` → tipo `DailyReconciliationSummary` ganha `devolucoes_rede: number`

### Frontend
- `ResumoDiaPanel.tsx` — sub-linha no Pilar 5 (Contas do Dia): `Devoluções REDE: - R$ X`
- `MaquininhasDetailModal.tsx` — KPI extra: `Total Devoluções`

---

## Features Existentes Impactadas

| Feature | Risco |
|---|---|
| Feature 234 — Conciliação Tripla Maquininhas | ⚠️ RPC reescrita — validar `total_nao_entrou` e `status_compensacao` |
| Feature 235 — Maquininhas Não Entradas por Loja | ⚠️ `nao_entrou_valor` por loja pode mudar com devoluções presentes |
| Feature 238 — Marco Zero e Limpeza | ✅ Sem impacto direto |
| Feature 239 — Modal Maquininhas 2XL | ⚠️ Novo KPI `total_devolucoes` no modal |
| Feature 236 — Somatório OS Pátio (pending) | ⚠️ Mesmo CTE `patio_store` — o fix temporal melhora o valor do Na Loja OS histórico |

---

## Risco Principal

**Bug 2 (Janela Temporal) — Probabilidade: Alta | Impacto: Parcialmente Reversível**
- `CASE WHEN last_payment_date IS NULL` preserva comportamento atual para OSs antigas. Sem regressão.
- Mitigação: Migration com `DEFAULT NULL` — OSs existentes não são afetadas.

**Bug 1 (Devoluções) — Probabilidade: Média | Impacto: Reversível**
- Detecção de devoluções depende do formato do arquivo Rede.
- Mitigação: `DEFAULT 'venda'` — sem breaking change para dados existentes.
