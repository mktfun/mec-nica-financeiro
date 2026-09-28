# Spec 441 — Baixa Rede × OS e Recálculo Atômico do Pátio de Loja e Holding

## 1. Problema e Evidência Forense Confirmada

Após vincular manualmente uma venda de cartão Rede a uma Ordem de Serviço na tela de conciliação:
- **OS #1120** (Maurilio Volpini, filial `st-03`, ID `bba042e6-d55d-4ac2-8835-39d85cf666aa`) passou a exibir:
  - Valor Total: **R$ 6.583,80**
  - Valor Pago: **R$ 3.794,28** (proveniente da transação POS Rede ID `e85b4bac-db66-407c-a840-08c7718fdebf`, bruto R$ 3.794,28, Visa Crédito de 25/09)
  - Saldo Individual Aberto: **R$ 2.789,52** (`6.583,80 − 3.794,28 = 2.789,52`)
  - Status: `pago_parcial`
- **Sintoma do Bug:**
  - O indicador de topo e resumo consolidado "Carros em Pátio" da filial `st-03` permaneceu estático em **R$ 6.953,70** (o valor pré-baixa, correspondente a R$ 3.794,28 da OS #1120 + R$ 3.159,42 de outra OS em aberto).
  - O total consolidado de pátio da holding em `daily_snapshots` permaneceu em **R$ 73.338,54** em vez do valor real de **R$ 69.544,26** (`73.338,54 − 3.794,28 = 69.544,26`).

---

## 2. Diagnóstico da Causa-Raiz (Código e Banco de Dados)

1. **Assincronia entre Mutações de Pátio:**
   - Em `StoreOrdensServicoView.tsx:153-182` e `PatioOsDetailModal.tsx:154-186`, quando um usuário edita uma OS diretamente no frontend, o cliente executa um recálculo ad-hoc de `patio_os` e faz UPDATE direto em `reconciliations.na_loja_os` e `daily_snapshots.total_patio`.
   - Já no vínculo manual via cartão (`StoreCartaoMaquininhaView.tsx` → `ManualMatchOsModal.tsx` → `useManualMatch.linkTransactionToOs`), é chamada a RPC `link_manual_rede_to_os` (`supabase/migrations/20260831000007_create_link_manual_pix_and_rede_rpcs.sql:134-246`).
   - A RPC `link_manual_rede_to_os` atualiza `patio_os.paid_value`, `status`, `credit_value`, `pos_transactions.matched_os_number` e insere em `conciliation_matches`, mas **NUNCA atualiza `reconciliations.na_loja_os` nem `daily_snapshots.total_patio`**.
2. **Precedência de Dados Antigos no Resumo (`get_daily_reconciliation_summary`):**
   - Na RPC `get_daily_reconciliation_summary` (`supabase/migrations/20260922000004_equalize_summary_rpc_centralized_saidas.sql:205-238`), o pátio por loja é retornado como:
     ```sql
     'na_loja_os', COALESCE(rt.na_loja_os, p.patio_total, 0),
     'patio_os', COALESCE(rt.na_loja_os, p.patio_total, 0)
     ```
     Onde `rt` é a tabela `reconciliations`. Como `reconciliations.na_loja_os` já existia gravado com R$ 6.953,70, ele tem prioridade sobre o cálculo vivo (`p.patio_total = 3.159,42`).
   - Para dias fechados (`is_closed = true`), a RPC retorna `daily_snapshots.total_patio` e `metadata->'stores'`, ambos congelados com o total antigo pré-baixa.
3. **Invalidation Incompleta no Hook:**
   - `useManualMatch.ts:236-249` invalida chaves gerais, mas não força a invalidação de `['store-ordens-servico', storeId, date]`, `['patio-os-detail-modal', date]` nem reprocessa o snapshot fechado.
4. **Desvinculação Incompleta (`unlink_manual_os_match`):**
   - Ao desvincular uma transação Rede via `unlink_manual_os_match`, a RPC remove o vínculo em `conciliation_matches` e limpa `matched_os_number`, mas não reverte a parcela de `paid_value` nem recalcula o pátio da filial/holding.

---

## 3. Solução Proposta

1. **Centralização Canônica do Recálculo de Pátio no PostgreSQL (RPC Atômica):**
   - Criar uma função interna/helper no PostgreSQL: `recompute_patio_for_date_and_store(p_date DATE, p_store_id TEXT)`.
   - Essa rotina calcula o somatório de saldo aberto real `SUM(GREATEST(0, total_value - paid_value))` de todas as OSs elegíveis da filial na data (`status NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')` e `opened_at::date <= p_date`).
   - Atualiza `reconciliations.na_loja_os` para a filial na data.
   - Recalcula a soma de todas as filiais e atualiza `daily_snapshots.total_patio` e `metadata.stores` para a data (se o snapshot existir).
2. **Integração na RPC `link_manual_rede_to_os`:**
   - Executar a baixa com trava atômica (`FOR UPDATE`).
   - Diferenciar baixa nova (quando `v_pos.gross_amount` é acrescido ao `paid_value`) de vínculo puramente informativo (quando a OS já computava aquele pagamento).
   - Chamar o recálculo canônico de pátio na mesma transação.
   - Retornar payload discriminado em JSONB contendo: `paid_before`, `paid_after`, `os_balance_before`, `os_balance_after`, `store_patio_before`, `store_patio_after`, `global_patio_before`, `global_patio_after`.
3. **Integração na RPC `unlink_manual_os_match`:**
   - Reverter com segurança a parcela de pagamento adicionada pelo vínculo e invocar o recálculo canônico de pátio.
4. **Alinhamento do Frontend e Invalidação de Cache:**
   - No hook `useManualMatch.ts`, incluir na lista de invalidação as chaves `['store-ordens-servico']`, `['patio-os-detail-modal']` e `['backend-dashboard']`.
   - Em `ManualMatchOsModal.tsx`, exibir feedback claro do impacto contábil da baixa no saldo da OS e no pátio da loja.

---

## 4. Contratos de Dados

### Tabelas Envolvidas:
- `public.patio_os`: `id`, `os_number`, `store_id`, `opened_at`, `closed_at`, `total_value`, `paid_value`, `credit_value`, `debit_value`, `status`, `match_status`.
- `public.reconciliations`: `date`, `store_id`, `na_loja_os`, `status`.
- `public.daily_snapshots`: `date`, `total_patio`, `is_closed`, `metadata`.
- `public.conciliation_matches`: `store_id`, `target_date`, `system_os_number`, `rede_transaction_id`, `status`.

### Contrato da RPC `link_manual_rede_to_os`:
- **Entrada:** `p_pos_id UUID`, `p_os_number TEXT`, `p_store_id TEXT DEFAULT NULL`, `p_amount NUMERIC DEFAULT NULL` (compatibilidade 100% mantida).
- **Retorno JSONB:**
  ```json
  {
    "success": true,
    "message": "Baixa de R$ 3.794,28 aplicada à OS #1120. Pátio atualizado.",
    "pos_id": "e85b4bac-db66-407c-a840-08c7718fdebf",
    "os_id": "bba042e6-d55d-4ac2-8835-39d85cf666aa",
    "os_number": "1120",
    "store_id": "st-03",
    "paid_before": 0.00,
    "paid_after": 3794.28,
    "os_balance_before": 6583.80,
    "os_balance_after": 2789.52,
    "store_patio_before": 6953.70,
    "store_patio_after": 3159.42,
    "global_patio_before": 73338.54,
    "global_patio_after": 69544.26,
    "accounting_effect": "baixa_aplicada"
  }
  ```

---

## 5. Arquivos Afetados

### Arquivos Existentes Reutilizados/Modificados:
- `src/hooks/useManualMatch.ts`: Invalidação de todas as chaves consumidoras de pátio e propagação do payload de feedback.
- `src/components/conciliacao/ManualMatchOsModal.tsx`: Feedback enriquecido do saldo e impacto no pátio.
- `src/components/conciliacao/StoreOrdensServicoView.tsx`: Utilização da mesma regra canônica de sincronização de pátio.
- `src/components/conciliacao/PatioOsDetailModal.tsx`: Utilização da mesma regra canônica.

### Arquivos Novos:
- `supabase/migrations/20260928000002_recompute_patio_and_atomic_rede_os_settlement.sql`: Migração contendo helper `recompute_patio_for_date_and_store`, atualização de `link_manual_rede_to_os` e `unlink_manual_os_match`.

---

## 6. Plano de Rollback

1. **Rollback de Banco de Dados:**
   - Backup do estado atual de `reconciliations` e `daily_snapshots` para `st-03` e datas 25/09 e 28/09 salvo em `.tmp/backup_patio_pre_441.json`.
   - Se houver falha, restaurar a versão anterior da RPC `link_manual_rede_to_os` de `20260831000007_create_link_manual_pix_and_rede_rpcs.sql`.
2. **Rollback de Frontend:**
   - Reverter os arquivos modificados em `src/` via `git checkout -- <arquivos>` mantendo o repositório íntegro.

---

## 7. Risco Principal e Mitigação

- **Risco:** Desalinhamento em dias fechados (`is_closed = true`), onde uma baixa realizada retroativamente em data passada altere o snapshot histórico sem autorização ou rastro.
- **Mitigação:** A rotina verifica a data alvo da venda e da OS. Caso o dia esteja fechado, a sincronização do snapshot registra no `metadata.audit_log` o motivo da revisão (vínculo manual de OS), recalculando os totais derivados de forma idempotente sem alterar saldos bancários ou movimentações OFX.

---

## 8. Skills Especializadas Aplicadas

- `sdd-proposal`: Estruturação da tríade de especificação física determinística.
- `database`: DDL SQL, RPCs atômicas, RLS, idempotência e locking transacional.
- `frontend-design-pro`: Padrões de design system Zinc-950 de `DESIGN.md`.
