# 📋 Handoff Report — Codebase Analysis & Data Seeding Plan

**Agent:** Explorer 1 (`teamwork_preview_explorer`)  
**Working Directory:** `c:\Users\admin\.gemini\antigravity\scratch\mec-nica-financeiro\.agents\explorer_1`  
**Date:** 2026-07-24  

---

## 1. Observation

### 1.1 Registered Stores List
Querying the `public.stores` table in Supabase returned **10 active registered stores**:
| Store ID | Store Name | Status |
|---|---|---|
| `st-01` | Dom Pedro - DP | Active |
| `st-02` | Jabaquara - JAB | Active |
| `st-03` | Jorge Beretta - DHJV | Active |
| `st-04` | Kennedy - MP | Active |
| `st-05` | Piraporinha - EMPORIO | Active |
| `st-06` | Planalto - BRASICAR | Active |
| `st-07` | Rudge Ramos - CAP | Active |
| `st-08` | Santo André - HD | Active |
| `st-09` | Rei do Módulo - MP | Active |
| `3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f` | Maua - MHE | Active |

### 1.2 Database Tables & Schema Models

#### A. `public.patio_os` (Ordens de Serviço do Pátio)
- **Primary Key:** `id` (`UUID`, default `gen_random_uuid()`)
- **Key Columns:**
  - `os_number`: `TEXT` (Not Null, e.g. `'4821'`, `'STRESS_1001'`)
  - `plate`: `TEXT` (Not Null, e.g. `'ABC-1234'`)
  - `total_value`: `NUMERIC` (Not Null, default `0`)
  - `paid_value`: `NUMERIC` (Not Null, default `0`)
  - `status`: `TEXT` (Not Null, default `'em_aberto'`; valid values: `'em_aberto'`, `'ENTROU'`, `'finalizado'`, `'pago_parcial'`)
  - `opened_at`: `TIMESTAMPTZ` (Not Null, default `now()`)
  - `closed_at`: `TIMESTAMPTZ` (Nullable)
  - `days_open`: `INTEGER` (Nullable)
  - `payment_method`: `TEXT` (Nullable, e.g. `'CARTÃO'`, `'PIX'`, `'DINHEIRO'`)
  - `store_id`: `TEXT` (FK referencing `stores(id)` ON DELETE CASCADE/SET NULL)
  - `store_name`: `TEXT` (Nullable)
  - `history_log`: `JSONB` (Nullable)
  - `updated_at`: `TIMESTAMPTZ`

#### B. `public.transactions` (Lançamentos de Cartão Rede e Extrato Bancário OFX)
- **Primary Key:** `id` (`UUID`, default `gen_random_uuid()`)
- **Key Columns:**
  - `title`: `TEXT` (Not Null, e.g. `'Venda Crédito Master'`, `'PIX QR CODE RECEBIDO'`)
  - `subtitle`: `TEXT` (Nullable)
  - `amount`: `NUMERIC` (Not Null)
  - `type`: `TEXT` (Not Null, `'in'` | `'out'`)
  - `source`: `TEXT` (Nullable, `'rede'`, `'ofx'`, `'maquininha'`, `'rede_taxa'`, `'sistema'`)
  - `payment_method`: `TEXT` (Nullable, `'credito'`, `'debito'`, `'pix'`, `'transf'`)
  - `os_number`: `TEXT` (Nullable)
  - `target_date`: `DATE` / `TEXT` (Nullable, format `'YYYY-MM-DD'`)
  - `occurred_at`: `TIMESTAMPTZ` (Not Null, default `now()`)
  - `store_id`: `TEXT` (FK referencing `stores(id)`)
  - `store_name`: `TEXT` (Nullable)
  - `icon_type`: `TEXT` (Nullable)
  - `created_at`: `TIMESTAMPTZ`

#### C. `public.reconciliations`
- **Primary Key:** `id` (`UUID`, default `gen_random_uuid()`)
- **Key Columns:**
  - `store_id`: `TEXT` (FK referencing `stores(id)`)
  - `date`: `DATE` / `TEXT` (Not Null, format `'YYYY-MM-DD'`)
  - `status`: `TEXT` (Not Null, default `'pending'`; values: `'pending'`, `'approved'`, `'divergence'`)
  - `os_total`: `NUMERIC` (Nullable)
  - `os_count`: `INTEGER` (Nullable)
  - `machine_total`: `NUMERIC` (Nullable)
  - `machine_fees`: `NUMERIC` (Nullable)
  - `bank_total`: `NUMERIC` (Nullable)
  - `financial_total`: `NUMERIC` (Nullable)
  - `divergence`: `NUMERIC` (Nullable)
  - `bank_divergence`: `NUMERIC` (Nullable)
  - `daily_cash`: `NUMERIC` (Nullable)
  - `ofx_imported`: `BOOLEAN` (Nullable)
  - `top_error`: `TEXT` (Nullable)
  - `bot_run_id`: `UUID` (Nullable)
  - `processed_at`: `TIMESTAMPTZ` (Nullable)
  - `created_at`: `TIMESTAMPTZ`

#### D. `public.conciliation_matches`
- **Primary Key:** `id` (`UUID`, default `gen_random_uuid()`)
- **Key Columns:**
  - `store_id`: `TEXT` (FK referencing `stores(id)`)
  - `target_date`: `DATE` / `TEXT`
  - `match_type`: `TEXT` (`'EXATO'`, `'IA'`, `'MANUAL'`, `'MANUAL_OVERRIDE'`, `'PIX_DIRECT'`, `'REDE_DEPOSIT'`, `'TRIPLE_MATCH'`)
  - `system_os_number`: `TEXT` (Nullable)
  - `ofx_transaction_id`: `UUID` (Nullable, FK referencing `transactions(id)` — *Must be valid UUID or NULL*)
  - `rede_transaction_id`: `UUID` (Nullable, FK referencing `transactions(id)` — *Must be valid UUID or NULL*)
  - `confidence_score`: `NUMERIC` / `INTEGER` (0 to 100)
  - `status`: `TEXT` (`'APPROVED'`, `'PENDING'`)
  - `reasoning`: `TEXT` (Nullable)
  - `notes`: `TEXT` (Nullable)
  - `created_at`: `TIMESTAMPTZ`

#### E. `public.ai_execution_logs` (Telemetria & Auditoria de IA)
- **Primary Key:** `id` (`UUID`, default `gen_random_uuid()`)
- **Key Columns:**
  - `store_id`: `TEXT` (Nullable, FK referencing `stores(id)`)
  - `provider`: `TEXT` (Not Null, e.g. `'google'`, `'openai'`, `'anthropic'`)
  - `model`: `TEXT` (Not Null, e.g. `'gemini-2.0-flash'`, `'gpt-4o-mini'`, `'claude-3-5-sonnet-20240620'`)
  - `prompt_tokens`: `INTEGER` (Not Null, default `0`)
  - `completion_tokens`: `INTEGER` (Not Null, default `0`)
  - `total_tokens`: `INTEGER` (Not Null, default `0`)
  - `estimated_cost`: `NUMERIC` (Not Null, cost in USD)
  - `execution_time_ms`: `INTEGER` (Not Null)
  - `raw_payload_json`: `JSONB` (Input JSON payload)
  - `raw_response_json`: `JSONB` (Raw LLM API response)
  - `reasoning_steps_json`: `JSONB` (Array of step-by-step match reasoning)
  - `matches_applied_count`: `INTEGER` (Count of matches with confidence $\ge 90\%$)
  - `created_at`: `TIMESTAMPTZ` (Not Null, default `now()`)

#### F. `public.import_logs`
- **Primary Key:** `id` (`UUID`, default `gen_random_uuid()`)
- **Key Columns:** `store_id`, `store_name`, `target_date`, `total_os`, `os_count`, `total_paid_all`, `receivables_count`, `total_dinheiro`, `created_at`.

### 1.3 AI Reconciliation Engine Implementation & Telemetry
- **File:** `src/lib/llm-matcher.ts`
- **Hook:** `src/hooks/useBackgroundAiReconciler.ts`
- **Function:** `generateTripleMatchSuggestions(settings, unmatchedOs, unmatchedRede, unmatchedOfx, storeId)`
- **Behavior:**
  1. Compiles unmatched records into a JSON payload.
  2. Calls configured LLM (`Google Gemini`, `OpenAI`, or `Anthropic Claude`).
  3. Calculates token counts (`prompt_tokens`, `completion_tokens`, `total_tokens`), execution time (`execution_time_ms`), and estimated cost in USD based on `TOKEN_PRICING` lookup.
  4. Saves complete audit trail to `ai_execution_logs` table via `saveTelemetryLog()`.
  5. Matches with `confidence >= 90%` are automatically inserted into `public.conciliation_matches` by `useBackgroundAiReconciler`.

---

## 2. Logic Chain

1. **Database Schema & Store Mapping:**
   The 10 stores found in `public.stores` (`st-01` through `st-09` and `3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f`) serve as the anchor `store_id` values across all financial tables.
2. **Reconciliation Calculation Engine:**
   The deterministic reconciliation logic in `src/hooks/useConciliacao.ts` (`useReconciliationViews`) classifies transactions into 4 distinct layers:
   - **Layer 1 (Camada 1):** 1:1 exact matching between card sales and bank deposits (`|amount_rede - amount_ofx| <= 0.05`).
   - **Layer 2 (Camada 2):** Backtracking Subset-Sum algorithm ($N \le 6$) finding exact combinations of card sales matching a single bank deposit on $D-0$.
   - **Layer 3 (Camada 3):** Backtracking Subset-Sum extending to $D-1$ / $D-2$ temporal window for weekend sales clearing on Monday.
   - **Layer 4 (Camada 4):** Exception isolation for unmatched card sales or unassigned bank deposits.
   - **PIX Layer:** Direct 1:1 matching between OS PIX payments and OFX PIX bank deposits.
3. **Headless AI Telemetry Execution:**
   When unmatched records remain, `useBackgroundAiReconciler` triggers `generateTripleMatchSuggestions`. It logs prompt/completion tokens, execution time, USD cost, and step-by-step reasoning JSON into `ai_execution_logs`. Matches $\ge 90\%$ auto-persist to `conciliation_matches`.
4. **Safeguarded Test Data Purging Strategy:**
   To guarantee 100% clean teardown without touching production or seed data, all inserted mock records will share a unique batch tag `STRESS_TEST_<TIMESTAMP>` embedded in key searchable text columns (`os_number`, `title`, `subtitle`, `top_error`, `store_name`, `notes`). A single `purge_stress_test_batch` SQL execution will clean all affected tables.

---

## 3. Caveats

- **Foreign Key Constraints on `conciliation_matches`:** `ofx_transaction_id` and `rede_transaction_id` reference `public.transactions(id)`. Synthetic strings or invalid UUIDs cause hard database errors. Synthetic IDs must be converted to `null` or point to real inserted `transactions.id` UUIDs.
- **Headless AI Key Requirement:** `useBackgroundAiReconciler` requires `aiSettings.api_key` and `aiSettings.provider` to be configured in `ai_settings` or passed via parameter. If API key is absent, AI execution throws an error (handled gracefully).

---

## 4. Conclusion & Data Seeding Plan

### 4.1 Detailed Data Seeding Plan for Stress Testing

#### A. Seed Target Parameters
- **Target Date:** `2026-07-24` (or specified test date).
- **Batch Identifier:** `STRESS_TEST_20260724_170000` (incorporating UTC timestamp).
- **Stores Included:** ALL 10 registered stores (`st-01` to `st-09`, `3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f`).

#### B. Mock Financial Dataset per Store (4 Scenarios)
For **EACH** of the 10 stores, the seeding script will insert:

1. **Scenario 1: 100% Triple Match (OS + Rede + OFX)**
   - `patio_os`: `os_number = 'STRESS_<STORE_ID>_TRIPLE_01'`, `total_value = 1850.00`, `paid_value = 1850.00`, `payment_method = 'CARTÃO'`.
   - `transactions` (Rede): `source = 'rede'`, `amount = 1850.00`, `os_number = 'STRESS_<STORE_ID>_TRIPLE_01'`, `type = 'in'`.
   - `transactions` (OFX): `source = 'ofx'`, `amount = 1850.00`, `type = 'in'`, `title = 'STRESS_TEST_20260724_170000 | DEPOSITO REDECARD'`.

2. **Scenario 2: Partial Match - OS + Rede without OFX (Card Sale Pending Deposit)**
   - `patio_os`: `os_number = 'STRESS_<STORE_ID>_PARTIAL_REDE'`, `total_value = 920.00`, `paid_value = 920.00`, `payment_method = 'CARTÃO'`.
   - `transactions` (Rede): `source = 'rede'`, `amount = 920.00`, `os_number = 'STRESS_<STORE_ID>_PARTIAL_REDE'`, `type = 'in'`.
   - `transactions` (OFX): None.

3. **Scenario 3: Partial Match - OS + OFX without Rede (Direct Bank PIX)**
   - `patio_os`: `os_number = 'STRESS_<STORE_ID>_PARTIAL_PIX'`, `total_value = 650.00`, `paid_value = 650.00`, `payment_method = 'PIX'`.
   - `transactions` (Rede): None.
   - `transactions` (OFX): `source = 'ofx'`, `amount = 650.00`, `type = 'in'`, `title = 'STRESS_TEST_20260724_170000 | PIX RECEBIDO CLIENTE'`.

4. **Scenario 4: Exception Cases (Unmatched OS, Unmatched Rede, Unmatched OFX)**
   - **Unmatched OS:** `os_number = 'STRESS_<STORE_ID>_UNMATCHED_OS'`, `total_value = 3100.00`, `status = 'em_aberto'`.
   - **Unmatched Rede:** `source = 'rede'`, `amount = 410.00`, `title = 'STRESS_TEST_20260724_170000 | Venda Avulsa Maquininha'`.
   - **Unmatched OFX:** `source = 'ofx'`, `amount = 1250.00`, `type = 'in'`, `title = 'STRESS_TEST_20260724_170000 | DEPOSITO DINHEIRO CAIXA ELETRONICO'`.

#### C. Purge Strategy (100% Cleanup Guarantee)
To safely purge 100% of generated test data:
```sql
-- Single Purge Query Execution:
DELETE FROM public.conciliation_matches WHERE system_os_number LIKE 'STRESS_%' OR notes LIKE '%STRESS_TEST_%';
DELETE FROM public.reconciliacoes_triplas WHERE store_id IN (SELECT id FROM stores) AND created_at >= '<SEED_START_TIME>';
DELETE FROM public.transactions WHERE title LIKE 'STRESS_TEST_%' OR subtitle LIKE '%STRESS_TEST_%' OR icon_type LIKE 'STRESS_TEST_%';
DELETE FROM public.patio_os WHERE os_number LIKE 'STRESS_%';
DELETE FROM public.reconciliations WHERE top_error LIKE '%STRESS_TEST_%';
DELETE FROM public.import_logs WHERE store_name LIKE '%STRESS_TEST_%';
DELETE FROM public.ai_execution_logs WHERE created_at >= '<SEED_START_TIME>';
```

---

## 5. Verification Method

To verify the findings and plan independently:
1. **Inspect Registered Stores:**  
   Execute: `cmd.exe /c node -e "const { createClient } = require('@supabase/supabase-js'); const s = createClient('<URL>', '<KEY>'); s.from('stores').select('id, name, active').then(res => console.log(res.data));"`
2. **Inspect Engine Files:**  
   View `src/lib/llm-matcher.ts`, `src/hooks/useBackgroundAiReconciler.ts`, and `src/hooks/useConciliacao.ts`.
3. **Validate Telemetry Model:**  
   View `src/routes/agente.tsx` (lines 66-84) to verify how `ai_execution_logs` data is consumed and rendered.
