# Proposal: Correção de `occurred_at` em `pos_transactions` e Blindagem de Contratos na Esteira Manual (363)

## Problema
Ao tentar importar relatórios da adquirente Rede na **Fase 2 do Fechamento Manual** (`Fase2RedeVsOsReview.tsx`), o Supabase/PostgreSQL retorna o seguinte erro:
```json
{
  "code": "23502",
  "details": null,
  "hint": null,
  "message": "null value in column \"occurred_at\" of relation \"pos_transactions\" violates not-null constraint"
}
```

### Causa Raiz Forense
1. **Omissão de Colunas Mandatórias em `pos_transactions`:**
   - A tabela `public.pos_transactions` possui a restrição `occurred_at TIMESTAMPTZ NOT NULL` sem default.
   - O objeto montado no `onDrop` de `Fase2RedeVsOsReview.tsx` omitiu completamente o campo `occurred_at`.
   - O campo `fee_amount` lia `t.feeAmount || 0`, mas a interface `RedeTransaction` (`redeParser.ts`) exporta a taxa descontada como `interest`, resultando em taxas MDR sempre zeradas.
   - O `transaction_type` ('venda' ou 'devolucao') não estava sendo repassado, distorcendo estornos e chargebacks.
   - O fallback `'st-default'` para filiais não mapeadas ameaça violar a foreign key `pos_transactions_store_id_fkey` (`REFERENCES stores(id)`), disparando erro `23503`.
   - A inserção utilizava `.insert()` simples sem `dedup_hash`, o que em re-uploads causaria duplicação de vendas e explosão artificial de "Cartões a Compensar" no balanço patrimonial.

2. **Vulnerabilidades Idênticas e Iminentes nas Fases Subsequentes:**
   - **Fase 3 (`Fase3OfxReconciliation.tsx`):** A tabela `public.ofx_transactions` exige `bank_name TEXT NOT NULL` e `occurred_at TIMESTAMPTZ NOT NULL`. O código atual omite ambos e envia campos com nomes errados (`description` e `date`), o que dispararia o mesmo erro 23502 ao subir extratos OFX.
   - **Fase 4 (`Fase4ContasVsSaidasReview.tsx`):** A tabela `public.daily_manual_bills` exige `title TEXT NOT NULL`, mas o código enviava `description`. Além disso, a RPC `auto_match_saidas` é chamada com `{ p_target_date: targetDate }`, enquanto sua assinatura SQL canônica exige `{ p_date: targetDate }` (gerando erro PGRST202).

---

## Solução Proposta (Foco em Reuso e Correção)

Em estrita conformidade com os princípios de reuso do projeto, **nenhuma nova tabela, hook ou componente será criado**. Ajustaremos cirurgicamente os payloads de inserção e chamadas nos componentes existentes:

1. **`src/components/importacoes/manual/Fase2RedeVsOsReview.tsx` [MODIFY]:**
   - Compor `occurred_at` com base em `t.date` e `t.time` (com fallback robusto para `${targetDate}T12:00:00Z`).
   - Mapear `fee_amount` a partir de `t.interest` (e fallback `t.feeAmount`).
   - Mapear `transaction_type` ('venda' ou 'devolucao').
   - Gerar `dedup_hash` determinístico com `generateDeterministicHash` de `@/lib/parsers/hashUtils`.
   - Sanitizar `store_id`: se não encontrar correspondência em `stores`, persistir `null` em vez de `'st-default'`.
   - Deduplicar em memória via `Map` e persistir com `.upsert(txsToInsert, { onConflict: 'store_id, dedup_hash', ignoreDuplicates: true })`.

2. **`src/components/importacoes/manual/Fase3OfxReconciliation.tsx` [MODIFY]:**
   - Compor `bank_name` (extraído do alias do extrato ou 'Itaú') e `occurred_at`.
   - Mapear `counterpart_name` (em vez do inexistente `description`) e `fitid` (com fallback determinístico).
   - Sanitizar `store_id` (substituir `'st-default'` por `null`).
   - Deduplicar em memória por `store_id + fitid` e persistir com `.upsert(txsToInsert, { onConflict: 'store_id, fitid', ignoreDuplicates: true })`.
   - Corrigir a leitura em `loadOfxData` para mapear `counterpart_name` e `occurred_at`.

3. **`src/components/importacoes/manual/Fase4ContasVsSaidasReview.tsx` [MODIFY]:**
   - Mapear `title` (obrigatório NOT NULL) a partir de `b.description || b.title || 'Título a Pagar'`.
   - Corrigir o parâmetro da RPC `auto_match_saidas` de `{ p_target_date: targetDate }` para `{ p_date: targetDate }`.
   - Sanitizar `store_id` (substituir `'st-default'` por `null`).

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Encontradas:**
  - `pos_transactions` (`supabase/migrations/20260807000009_schema_cleanup_and_split.sql`): Tabela física canônica de maquininhas.
  - `ofx_transactions`: Tabela física canônica de extratos bancários.
  - `daily_manual_bills`: Tabela física canônica de contas a pagar.
  - RPC `auto_match_saidas(p_date date)`: Já existente em `20260831000003_fix_saidas_ofx_and_contas_automatch.sql`.
  - RPC `match_stage2_rede_os(p_target_date date)`: Já existente em `20260903000027_create_match_stage2_rede_os.sql`.
- **Componentes / Hooks Existentes Encontrados:**
  - `Fase2RedeVsOsReview.tsx`, `Fase3OfxReconciliation.tsx`, `Fase4ContasVsSaidasReview.tsx`.
  - `generateDeterministicHash` em `@/lib/parsers/hashUtils`: Função utilitária já testada no projeto para criação de hashes determinísticos.
- **Justificativa para Artefatos Novos:**
  - **Zero artefatos novos.** Todas as correções são estritamente pontuais nos 3 componentes da esteira manual.

---

## Contratos de Dados & SQL (Supabase)

### 1. Contrato de Inserção em `pos_transactions`
```typescript
interface PosTransactionPayload {
  id: string; // UUID gerado
  store_id: string | null; // ID de filial existente em stores.id ou null
  machine_name: string; // t.storeName || 'Rede'
  payment_method: string; // t.method || 'Cartão Crédito/Débito'
  gross_amount: number; // Math.abs(t.grossAmount || t.netAmount || 0)
  net_amount: number; // Math.abs(t.netAmount || 0)
  fee_amount: number; // Math.abs(t.interest || 0)
  occurred_at: string; // ISO 8601 UTC: `${baseDate}T${time}Z`
  target_date: string; // targetDate (YYYY-MM-DD)
  dedup_hash: string; // Gerado via generateDeterministicHash
  transaction_type: 'venda' | 'devolucao';
  settlement_status: 'a_compensar';
}
```

### 2. Contrato de Inserção em `ofx_transactions`
```typescript
interface OfxTransactionPayload {
  id: string; // UUID gerado
  store_id: string | null; // ID de filial existente em stores.id ou null
  bank_name: string; // r.bankName || 'Itaú'
  type: 'in' | 'out'; // Normalizado de t.type ou t.amount > 0
  amount: number; // Math.abs(t.amount)
  occurred_at: string; // `${baseDate}T12:00:00Z`
  fitid: string; // Identificador bancário único
  counterpart_name: string | null; // t.counterpart_name || t.memo || t.payee
  cnpj_cpf: string | null;
  target_date: string; // targetDate
  contabilizar_no_subtotal: boolean; // true
}
```

---

## Risco Principal e Mitigação

- **Risco Principal:** Re-upload de planilhas gerando transações duplicadas em `pos_transactions` e inflando o montante de "Cartões a Compensar" no fechamento do dia.
- **Mitigação:** 
  1. Geração de `dedup_hash` com alta entropia (`store_id + data + valor + NSU/Auth/TID`).
  2. Deduplicação em memória em `Map` antes do envio.
  3. Uso estrito de `.upsert(txs, { onConflict: 'store_id, dedup_hash', ignoreDuplicates: true })`.
