# Design: Raio-X da Conciliação — Transparência de Contas (151)

## Arquitetura Técnica

```
[Usuário clica "🔍 Detalhes" em uma loja na tabela de conciliação]
   → BreakdownModal abre (activeStore: {id, name}, activeDate)
   → useConciliationBreakdown (enabled=true, lazy)
   → Supabase RPC: get_conciliation_breakdown(store_id text, date date)
   → banco:
       1. reconciliations  → bank_total, na_loja_os, se tem snapshot
       2. ofx_transactions → todas as linhas type=in e type=out do dia
       3. patio_os         → todas as OSs abertas/fechadas no dia, com flag is_previous_month
       4. pos_transactions → todas as transações com fee_amount do dia
   → retorna JSON com 4 arrays de transações + totais
   → BreakdownModal renderiza 4 abas com tabelas transaction-level

[Fix paralelo: juros_atual hardcode]
   → conciliacao.index.tsx L76: juros_atual: 0 → query SUM(fee_amount) de pos_transactions
```

## RPC: `get_conciliation_breakdown`

```sql
CREATE OR REPLACE FUNCTION get_conciliation_breakdown(p_store_id text, p_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_total numeric;
  v_bank_total_source text;
  v_has_snapshot boolean;
  v_ofx_in json;
  v_ofx_out json;
  v_ofx_out_total numeric;
  v_na_loja_os numeric;
  v_na_loja_os_source text;
  v_na_loja_detail json;
  v_juros_rede numeric;
  v_juros_detail json;
BEGIN
  -- 1. bank_total: de onde vem?
  SELECT EXISTS(SELECT 1 FROM reconciliations WHERE store_id = p_store_id AND date = p_date::text)
  INTO v_has_snapshot;
  
  IF v_has_snapshot THEN
    SELECT COALESCE(bank_total, 0) INTO v_bank_total
    FROM reconciliations WHERE store_id = p_store_id AND date = p_date::text;
    v_bank_total_source := 'snapshot_reconciliations';
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_bank_total
    FROM ofx_transactions WHERE store_id = p_store_id AND target_date = p_date AND type = 'in';
    v_bank_total_source := 'realtime_ofx_transactions';
  END IF;
  
  -- 2. Entradas OFX (detalhamento)
  SELECT COALESCE(json_agg(
    json_build_object('id', id, 'amount', amount, 'description', COALESCE(counterpart_name, bank_name), 'occurred_at', occurred_at, 'fitid', fitid)
    ORDER BY occurred_at DESC
  ), '[]') INTO v_ofx_in
  FROM ofx_transactions WHERE store_id = p_store_id AND target_date = p_date AND type = 'in';

  -- 3. Saídas OFX (despesas)
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_ofx_out_total
  FROM ofx_transactions WHERE store_id = p_store_id AND target_date = p_date AND type = 'out';
  
  SELECT COALESCE(json_agg(
    json_build_object('id', id, 'amount', ABS(amount), 'description', COALESCE(counterpart_name, bank_name), 'occurred_at', occurred_at, 'fitid', fitid)
    ORDER BY occurred_at DESC
  ), '[]') INTO v_ofx_out
  FROM ofx_transactions WHERE store_id = p_store_id AND target_date = p_date AND type = 'out';
  
  -- 4. Na Loja OS
  IF v_has_snapshot THEN
    SELECT COALESCE(na_loja_os, 0) INTO v_na_loja_os
    FROM reconciliations WHERE store_id = p_store_id AND date = p_date::text;
    v_na_loja_os_source := 'snapshot_reconciliations';
  ELSE
    SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) INTO v_na_loja_os
    FROM patio_os WHERE store_id = p_store_id AND (opened_at::date = p_date OR closed_at::date = p_date);
    v_na_loja_os_source := 'realtime_patio_os';
  END IF;
  
  -- Detalhamento das OSs (com mês de abertura para identificar "mês passado")
  SELECT COALESCE(json_agg(
    json_build_object(
      'os_number', os_number,
      'status', status,
      'opened_at', opened_at,
      'closed_at', closed_at,
      'total_value', total_value,
      'paid_value', paid_value,
      'remaining', COALESCE(total_value, 0) - COALESCE(paid_value, 0),
      'is_previous_month', (DATE_TRUNC('month', opened_at) < DATE_TRUNC('month', p_date::timestamp))
    ) ORDER BY opened_at DESC
  ), '[]') INTO v_na_loja_detail
  FROM patio_os 
  WHERE store_id = p_store_id 
    AND (opened_at::date = p_date OR closed_at::date = p_date);
  
  -- 5. Juros/Taxas da Maquininha
  SELECT COALESCE(SUM(fee_amount), 0) INTO v_juros_rede
  FROM pos_transactions WHERE store_id = p_store_id AND target_date = p_date;
  
  SELECT COALESCE(json_agg(
    json_build_object('id', id, 'gross_amount', gross_amount, 'fee_amount', fee_amount, 'payment_method', payment_method, 'occurred_at', occurred_at)
    ORDER BY occurred_at DESC
  ), '[]') INTO v_juros_detail
  FROM pos_transactions WHERE store_id = p_store_id AND target_date = p_date AND fee_amount > 0;
  
  RETURN json_build_object(
    'bank_total', v_bank_total,
    'bank_total_source', v_bank_total_source,
    'ofx_in_transactions', v_ofx_in,
    'ofx_out_total', v_ofx_out_total,
    'ofx_out_transactions', v_ofx_out,
    'na_loja_os', v_na_loja_os,
    'na_loja_os_source', v_na_loja_os_source,
    'na_loja_detail', v_na_loja_detail,
    'juros_rede', v_juros_rede,
    'juros_detail', v_juros_detail
  );
END;
$$;
```

## Interfaces TypeScript

```ts
// useConciliationBreakdown.ts
export interface OfxTransactionDetail {
  id: string;
  amount: number;
  description: string;
  occurred_at: string;
  fitid: string | null;
}

export interface OsDetail {
  os_number: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  total_value: number;
  paid_value: number;
  remaining: number;
  is_previous_month: boolean; // ← chave para diferenciar OS do mês passado
}

export interface JurosDetail {
  id: string;
  gross_amount: number;
  fee_amount: number;
  payment_method: string;
  occurred_at: string;
}

export interface ConciliationBreakdown {
  bank_total: number;
  bank_total_source: 'snapshot_reconciliations' | 'realtime_ofx_transactions';
  ofx_in_transactions: OfxTransactionDetail[];
  ofx_out_total: number;
  ofx_out_transactions: OfxTransactionDetail[];
  na_loja_os: number;
  na_loja_os_source: 'snapshot_reconciliations' | 'realtime_patio_os';
  na_loja_detail: OsDetail[];
  juros_rede: number;
  juros_detail: JurosDetail[];
}
```

## Componentes / Hooks

| Artefato | Arquivo | Responsabilidade |
|---|---|---|
| `get_conciliation_breakdown` | `supabase/migrations/20260810180000_conciliation_breakdown_rpc.sql` | RPC read-only com arrays de transações individuais |
| `useConciliationBreakdown` | `src/hooks/useConciliationBreakdown.ts` | Lazy query (enabled quando modal abre) |
| `BreakdownModal` | `src/components/conciliacao/BreakdownModal.tsx` | Modal com 4 abas de tabelas de transações |

## Fluxo de UI

1. Na tabela de lojas da tela de conciliação, cada linha ganha um botão `🔍 Raio-X`
2. Ao clicar, `BreakdownModal` abre com nome da loja + data no título
3. O modal tem **4 abas**:

   **Aba 1 — Entradas OFX (Banco)**
   Tabela: `Data/Hora | Descrição | FITID | Valor`
   - Cada transação de `ofx_transactions WHERE type='in'` do dia
   - Subtotal ao final
   - Badge de fonte: `📸 Snapshot bank_total` (verde) ou `⚡ Leitura ao vivo` (azul)
   - Alerta laranja se `bank_total=0` mas `ofx_in` tem dados: "Trigger desatualizado"

   **Aba 2 — Saídas OFX (Despesas)**
   Tabela: `Data/Hora | Descrição | FITID | Valor`
   - Cada transação de `ofx_transactions WHERE type='out'` do dia
   - Subtotal ao final

   **Aba 3 — Na Loja OS**
   Tabela: `Nº OS | Abertura | Status | Total | Pago | Restante | Pagamento`
   - Cada OS de `patio_os` abertas ou fechadas no dia
   - Linhas com `is_previous_month=true` em âmbar + badge `📅 Mês Anterior`
   - Dois subtotais: `Mês Atual: R$ X` e `Mês Anterior: R$ Y`

   **Aba 4 — Taxas Maquininha (Rede)**
   Tabela: `Hora | Forma Pgto | Bruto | Taxa R$ | Taxa % | Líquido`
   - Cada transação de `pos_transactions WHERE fee_amount > 0` do dia
   - Subtotal de taxas totais

4. Usuário fecha com X ou clicando fora

### Restrições visuais
- Dark UI Zinc-950, sem glassmorphism
- API do Modal existente: `<Modal title="..." isOpen onClose>children</Modal>`
- Badge de "Mês Passado" em vermelho/âmbar para os OSs do mês anterior

## Cenários de Verificação

- **Cenário 1:** Aba Entradas OFX de uma loja no dia 05/08 → lista cada transação individual com FITID e descrição, subtotal bate com `bank_total` exibido na tela → ✅
- **Cenário 2:** Aba Entradas mostra `bank_total=0` mas lista tem transações → alerta "Trigger desatualizado" aparece → ✅ diagnóstico exposto
- **Cenário 3:** Aba Na Loja OS → OSs de julho aparecem com badge "📅 Mês Anterior" e âmbar, separadas no subtotal → ✅
- **Cenário 4:** Aba Taxas Maquininha → mostra valor real de fee_amount (não mais zero) → ✅ fix do hardcode confirmado
- **Cenário 5 (edge):** Loja sem dados no dia → cada aba mostra "Nenhuma transação encontrada" sem crash → ✅
