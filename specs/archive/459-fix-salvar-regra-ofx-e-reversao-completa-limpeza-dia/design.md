# Design — Spec 459: Persistência de Regras OFX e Reversão Completa no Reset Diário

## Arquitetura de Fluxo

### Fluxo 1: Persistência de Regras OFX (Lembrar Fonte)
```
Usuário marca "Lembrar esta fonte para esta conta" no Wizard
  → handleToggleRememberRule(acctKey, storeId, chosenCand, true, selectedIdx)
  → useOfxBalanceMappings.saveRule({ account_key, source_kind, memo_normalized, is_active: true })
  → supabase.rpc('save_ofx_balance_rule', { ... }) [SECURITY DEFINER]
  → PostgreSQL:
      1. UPDATE public.ofx_balance_rules SET is_active = false WHERE account_key = p_account_key AND is_active = true
      2. INSERT INTO public.ofx_balance_rules (...) RETURNING id, version
  → Retorna { success: true, action: 'saved', version: N }
  → React Query invalida ['ofx_balance_rules']
  → Status exibe "✓ Regra Ativa" (verde)
  → Em próximas importações: get_ofx_balance_rules pré-seleciona a mesma fonte automaticamente!
```

### Fluxo 2: Backup Pré-Importação e Reset Diário Cirúrgico
```
[Ingestão - useImportProcessor.ts]:
  Arquivo OS importado para targetDate
    → savePatioOsAndReceivables verifica se existe backup em patio_os_daily_backups para (targetDate, storeId)
    → Se não existir:
        SELECT id, os_number, store_id, total_value, paid_value, status, raw_status, credit_value, debit_value, pix_transfer_value, cash_value, last_payment_date, closed_at, match_status
        FROM patio_os WHERE store_id = storeId
        → INSERT INTO patio_os_daily_backups (target_date, store_id, os_data) VALUES (...)
    → Aplica updates e inserts normalmente em patio_os e os_import_observations

[Reset Diário - PurgeDailyModal.tsx]:
  Usuário confirma "Resetar Dia" (p_date)
    → usePurgeDailyData.purgeDailyData(p_date)
    → supabase.rpc('purge_daily_financial_data', { p_date })
    → PostgreSQL:
        1. Para cada filial em patio_os_daily_backups WHERE target_date = p_date:
             a. DELETE FROM patio_os WHERE store_id = v_store_id AND id NOT IN (SELECT id FROM backup);
             b. UPDATE patio_os com os valores originais do backup (paid_value, credit_value, status, etc.);
        2. Fallback caso não haja backup:
             Reverte via os_import_observations (paid_value = paid_before, status recalculado);
        3. DELETE FROM os_import_observations WHERE target_date = p_date;
        4. DELETE FROM receivables WHERE date = p_date;
        5. DELETE FROM ofx_balance_selections WHERE reconciliation_date = p_date;
        6. DELETE FROM ofx_balance_selection_events WHERE reconciliation_date = p_date;
        7. DELETE FROM store_cash_vault WHERE entry_date = p_date;
        8. DELETE FROM pos_transactions, ofx_transactions, manual_transactions, daily_snapshots, reconciliations;
        9. DELETE FROM patio_os_daily_backups WHERE target_date = p_date;
        10. EXECUTA recompute_patio_for_date_and_store(p_date, store_id) para recalcular os saldos do pátio;
    → Retorna { success: true, restored_os_count: N, deleted_records: ... }
    → React Query invalida ['patio_os', 'available_store_os', 'reconciliations', 'daily_snapshots']
    → Pátio e conciliação voltam 100% ao estado anterior à importação!
```

---

## Interfaces TypeScript Reais

### 1. `SaveRulePayload` (em `useOfxBalanceMappings.ts`)
```typescript
export interface SaveRulePayload {
  account_key: string;
  store_id?: string;
  source_kind: string;
  memo_normalized?: string;
  is_active: boolean;
  user_id?: string;
}
```

### 2. Retorno da RPC `save_ofx_balance_rule`
```typescript
export interface SaveOfxBalanceRuleResult {
  success: boolean;
  action: 'saved' | 'revoked';
  rule_id?: string;
  account_key: string;
  version?: number;
}
```

### 3. Retorno da RPC `purge_daily_financial_data`
```typescript
export interface PurgeDailyResult {
  success: boolean;
  date: string;
  restored_os_count: number;
  deleted_new_os_count: number;
  deleted_observations: number;
  deleted_receivables: number;
  deleted_snapshots: number;
  deleted_reconciliations: number;
  deleted_pos_transactions: number;
  deleted_ofx: number;
  deleted_matches: number;
  deleted_bills: number;
  deleted_vault: number;
  recomputed_stores: string[];
}
```

---

## Cenários Obrigatórios

### Happy Path 1: Salvar Regra de Saldo OFX
1. Usuário importa extrato bancário da conta `0097_12345`.
2. O seletor oferece: "STMTTRN_MEMO: SALDO DO DIA (25/09)" vs "LEDGERBAL (25/09)".
3. Usuário escolhe `STMTTRN_MEMO` e marca "Lembrar esta fonte para esta conta".
4. RPC `save_ofx_balance_rule` executa e retorna `success: true`.
5. Badge exibe "✓ Regra Ativa".
6. Usuário recarrega a página ou avança para outro dia: a regra persiste e pré-seleciona a fonte salva.

### Happy Path 2: Reversão Completa de OS no Reset Diário
1. Pátio possui OS #100 com `paid_value = 0` e `status = 'em_aberto'`.
2. Importação do dia `2026-09-30` quita a OS #100 (`paid_value = 500`, `status = 'finalizada'`) e adiciona OS nova #101.
3. Backup pré-importação é gravado em `patio_os_daily_backups`.
4. Usuário percebe que importou o arquivo errado e clica em "Resetar Dados do Dia (30/09/2026)".
5. RPC restaura a OS #100 para `paid_value = 0`, `status = 'em_aberto'`, `closed_at = NULL` e remove a OS nova #101.
6. Pátio é recalculado e volta a exibir o saldo em aberto idêntico a antes da importação.

### Edge Case: Reset de Dia sem Backup Prévio (Fallback via `os_import_observations`)
1. Importação foi realizada antes da criação da tabela `patio_os_daily_backups`.
2. RPC detecta ausência de backup em `patio_os_daily_backups` e aciona o motor de fallback em `os_import_observations`.
3. Para cada OS observada na data, aplica `paid_value = paid_before`, `credit_value = credit_before`, `debit_value = debit_before` e remove vínculos.
4. Nenhuma exceção não tratada ocorre e o sistema se recupera com integridade.

---

## Critérios de Aceitação Verificáveis

1. Chamada a `save_ofx_balance_rule` executada com role `anon` salva com sucesso em `ofx_balance_rules` (zero erro RLS 42501).
2. Regra salva em `ofx_balance_rules` é retornada por `get_ofx_balance_rules`.
3. Execução de `purge_daily_financial_data(target_date)`:
   - Reverte valores de `patio_os` para o estado antes do lote.
   - Deleta `os_import_observations`, `receivables`, `ofx_balance_selections` e `patio_os_daily_backups` da data.
   - Recalcula o pátio via `recompute_patio_for_date_and_store`.
4. `npm run build` passa sem erros TypeScript.
5. Suíte de testes de regressão passa 100%.
