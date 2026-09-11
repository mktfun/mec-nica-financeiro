# Spec 382 — Correção das Justificativas de Transações Órfãs (Faturamento e Contas a Pagar)

## 1. Contexto & Problema
Na etapa 2 do Wizard de Importação (`Step2NonRevenueJustifications.tsx`), o operador financeiro justificou 3 transações bancárias de entrada órfãs e marcou a opção para **somar ao faturamento** (`impactsRevenue = true`). No entanto:
1. O faturamento não foi alterado na conciliação nem no fechamento do dia.
2. Nenhuma alteração foi persistida no banco de dados (`daily_revenue_adjustments` permaneceu inalterada).
3. O frontend exibiu toast verde de sucesso ("Entrada classificada!"), configurando uma **ação fantasma**.
4. O operador suspeitou que o mesmo problema estivesse ocorrendo nas saídas ("Contas a Pagar").

---

## 2. Diagnóstico Pericial Forense (Causas Raiz Identificadas)

### Causa Raiz 1: Quebra de Schema nas Queries do Step 2 (Colunas Inexistentes `title` e `subtitle`)
Em `Step2NonRevenueJustifications.tsx` (linhas 201-228), as queries do React Query `pending-ofx-outflows` e `pending-ofx-inflows` realizavam:
```ts
// Linha 203 e 222
.select('id, store_id, bank_name, type, amount, occurred_at, fitid, counterpart_name, title, subtitle, ...')
```
Na tabela física `public.ofx_transactions`, as colunas reais para descrição são `bank_name` e `counterpart_name`. As colunas `title` e `subtitle` **NÃO EXISTEM**.
- **Impacto:** O PostgREST rejeitava a query com HTTP 400 (`code: 42703, column ofx_transactions.title does not exist`).
- **Consequência:** `dbInflows` e `dbOutflows` retornavam arrays vazios (`[]`).

### Causa Raiz 2: Fallback Espúrio em Memória gerando IDs Não-UUID
Como `dbInflows` e `dbOutflows` falhavam e ficavam vazios, o componente caía no bloco de fallback que lia `results.ofxResults` (linhas 280-320 e 359-387). Nesses objetos lidos em memória:
```ts
id: tx.id || tx.fitid || `${ofxResult.alias}_${tx.amount}_${Math.random()}`
```
Como `tx.id` não existia no parser em memória, o campo `id` era preenchido com o `fitid` (hash determinístico alfanumérico, ex: `ofx_20260909100000_...`).

### Causa Raiz 3: Falha de Cast de UUID e Silenciamento de Erros no Salvamento
Em `handleSaveInflow`:
1. `supabase.from('ofx_transactions').update(...).eq('id', entry.id)`: Lançava erro `invalid input syntax for type uuid: "ofx_20260909..."` se o ID fosse fitid, ou atingia 0 linhas caso fosse gerado aleatoriamente.
2. `supabase.from('daily_revenue_adjustments').upsert({ id: entry.id, ... })`: Falhava pelo mesmo erro de sintaxe UUID.
3. Linha 500 de `Step2NonRevenueJustifications.tsx`:
```ts
if (adjErr) console.warn('Erro ao atualizar daily_revenue_adjustments:', adjErr);
```
O erro era **silenciado** com `console.warn` e o código executava `toast.success('Entrada classificada! (📈 Soma ao Faturamento)')`! O operador recebia confirmação visual de sucesso sem que nada fosse gravado.

### Causa Raiz 4: Desalinhamento da Data Contábil e Falta de `store_id`
Ao gravar em `daily_revenue_adjustments`:
```ts
date: entry.date || targetDate
```
Se `entry.date` viesse preenchida com a data bancária do lançamento (D-1, ex: 09/09) e a conciliação estivesse sendo feita para a data-alvo (ex: 10/09), o ajuste caía no dia anterior. Como a RPC `get_daily_reconciliation_summary` filtra estritamente por `WHERE date = v_target_date::date`, o ajuste era ignorado. Além disso, `store_id` não era persistido.

### Causa Raiz 5: Toast Fantasma no Fluxo de Saídas ("Contas a Pagar")
Em `handleSaveOutflow`:
A RPC `resolve_orphan_saida_ofx` retorna um objeto JSON `{ success: false, message: 'Transação OFX não encontrada.' }` quando não localiza a transação. O frontend verificava apenas `if (error) throw error` (que é nulo quando a RPC executa e retorna JSON). O frontend não inspecionava `data.success`, disparando toast verde de sucesso mesmo quando o débito não era vinculado nem gravado em `daily_manual_bills`.

### Causa Raiz 6: Desconexão Matemática de `v_contas_extras` na RPC `get_daily_reconciliation_summary`
Na RPC `get_daily_reconciliation_summary` (`20260911000040_fix_odometro_faturamento_anterior_chain.sql`, linhas 403-441):
1. A RPC calcula `v_contas_extras` separando contas marcadas como `Extra` ou criadas pelo wizard:
```sql
COALESCE(SUM(CASE WHEN category IN ('Pró-Labore', 'Distribuição Lucros', 'Extra') OR title ILIKE '%Pró-Labore%' OR title ILIKE '%Extra%' THEN amount ELSE 0 END), 0)
```
2. Porém, na atribuição de `v_contas_manual`:
```sql
IF v_contas_imported_bills > 0 THEN
    v_contas_base := v_contas_imported_bills;
ELSE
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_contas_base FROM ofx_transactions ...;
END IF;
v_contas_manual := v_contas_base; -- << NUNCA SOMA v_contas_extras!
```
3. `v_contas_extras` **nunca era somada** a `v_contas_manual`! Qualquer despesa extra criada pelo usuário era solenemente ignorada na DRE e no snapshot de fechamento.

---

## 3. Escopo da Solução

1. **Correção das Queries no Step 2 (`Step2NonRevenueJustifications.tsx`):**
   - Remover `title` e `subtitle` dos `.select()` de `ofx_transactions`.
   - Utilizar `counterpart_name` e `bank_name` como descritores oficiais.
   - Garantir que `dbInflows` e `dbOutflows` carreguem os registros reais com seus respectivos UUIDs do PostgreSQL.

2. **Blindagem do Salvamento de Entradas (`handleSaveInflow`):**
   - Gravar sempre `date: targetDate` em `daily_revenue_adjustments`.
   - Transportar `store_id: entry.storeId || null`.
   - Tratar `adjErr`: se houver erro ao persistir em `daily_revenue_adjustments`, lançar exceção imediatamente (`throw adjErr`) e bloquear toast de sucesso.
   - Atualizar `contabilizar_no_subtotal = true` e categoria na `ofx_transactions`.

3. **Blindagem do Salvamento de Saídas (`handleSaveOutflow`):**
   - Verificar `rpcRes?.success !== false`. Se a RPC retornar falha ou não encontrar a transação, lançar exceção visível no UI.

4. **Correção Matemática na RPC `get_daily_reconciliation_summary` e `close_daily_snapshot`:**
   - Adicionar `v_contas_extras` a `v_contas_manual`: `v_contas_manual := v_contas_base + v_contas_extras`.
   - Assegurar que `v_subtotal_contas` e o fechamento do dia reflitam fielmente todas as despesas extras classificadas pelo usuário.
   - Garantir que `v_faturamento_ajustes` continue sendo somado ao `faturamento_periodo`.

5. **Correção Preventiva em `useTransactions.ts`:**
   - Remover a coluna inexistente `title` de `useHistoricalReconciledTransactions`.

---

## 4. Impacto e Riscos
- **Risco Zero de Regressão:** As queries passarão a ter sucesso em vez de falhar por coluna inexistente.
- **Transparência Contábil:** Toda transação classificada para faturamento ou contas refletirá imediatamente no saldo da conciliação e na DRE.
