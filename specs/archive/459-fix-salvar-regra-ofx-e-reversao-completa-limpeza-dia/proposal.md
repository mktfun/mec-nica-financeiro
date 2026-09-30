# Spec 459 — Persistência Definitiva de Regras OFX e Reversão Completa de Dados no Reset Diário (Backup OS)

## Problema

Dois problemas críticos identificados na operação diária:

### 1. Regras de Saldo OFX não persistem ("sempre pede de novo")
Ao marcar a caixa "Lembrar esta fonte para esta conta" no passo de conciliação bancária do `CentralImportWizard.tsx`:
- O frontend dispara `saveRule` via `useOfxBalanceMappings.ts`, que executa `UPDATE` e `INSERT` diretamente na tabela `public.ofx_balance_rules`.
- A tabela `public.ofx_balance_rules` possui RLS ativo com permissão de escrita concedida **apenas** para o role `authenticated`.
- Como as requisições do frontend operam com a chave de cliente `anon`, o PostgreSQL rejeita a mutação com erro `42501: new row violates row-level security policy for table "ofx_balance_rules"`.
- O erro é silenciado no console (`console.error`), a tabela permanece com 0 registros e, a cada nova importação, o sistema não encontra nenhuma regra ativa e obriga o usuário a reconfigurar o saldo novamente.

### 2. A "Limpeza do Dia" (Reset Diário) não reverte as OSs nem restaura o estado anterior à importação
O botão "Resetar Dados do Dia" (disparado via `PurgeDailyModal.tsx` -> `usePurgeDailyData.ts` -> RPC `purge_daily_financial_data(p_date)`):
- Exclui transações POS, OFX, snapshots, reconciliações e contas a pagar do dia.
- **PORÉM, NÃO TOCA EM `patio_os`**:
  - Ordens de Serviço (OSs) que tiveram pagamentos baixados ou status alterados para `finalizada` na data `p_date` **permanecem quitadas e com os saldos alterados**.
  - OSs novas inseridas exclusivamente pela importação daquele dia **não são removidas**.
  - `os_import_observations` (tabela canônica de deltas de importação por `target_date`) **não é excluída nem utilizada para reversão**.
  - `receivables` importados na data **permanecem órfãos no banco**.
  - `ofx_balance_selections` e `ofx_balance_selection_events` **não são expurgados**.
  - O pátio não é recalculado após o expurgo (`recompute_patio_for_date_and_store`).

Como resultado, o usuário não consegue "limpar o dia e reimportar do zero", pois o estado do pátio e das OSs fica poluído e inconsistente.

---

## Solução Proposta

### Para o Problema 1: Persistência de Regras OFX
1. **Nova RPC `save_ofx_balance_rule` (SECURITY DEFINER):**
   - Criação de RPC transacional com permissão para `authenticated, anon, service_role`.
   - Desativação atômica de regras anteriores da mesma conta e inserção da nova versão ativa.
   - Atualização das políticas de RLS em `ofx_balance_rules` e `ofx_balance_selections` para permitir acesso a `anon`.
2. **Refatoração de `useOfxBalanceMappings.ts`:**
   - Trocar as chamadas manuais diretas à tabela por chamada à RPC `save_ofx_balance_rule`.
3. **Consolidação no `CentralImportWizard.tsx`:**
   - Garantir que `useOfxBalanceMappings` atualize as regras ativas quando os extratos forem carregados e aplique automaticamente o candidato indexado pela regra salva.

### Para o Problema 2: Reversão Completa e Backup Pré-Importação
1. **Tabela de Backup Pré-Importação `patio_os_daily_backups`:**
   - Antes de aplicar mutações em `patio_os` para um `target_date` e filial, o motor de importação (`useImportProcessor.ts` / `savePatioOsAndReceivables`) cria um snapshot dos registros existentes daquela filial na data se ainda não houver backup para aquele dia.
2. **Evolução da RPC `purge_daily_financial_data(p_date)`:**
   - **Reversão com Snapshot:** Se existir backup em `patio_os_daily_backups` para `p_date`:
     - Remove OSs criadas na data.
     - Restaura o estado exato anterior de `patio_os` a partir do backup.
     - Remove o backup da data.
   - **Reversão via Deltas (`os_import_observations`):** Fallback defensivo que restaura `paid_value = paid_before`, `credit_value = credit_before`, `debit_value = debit_before`, `pix_transfer_value = pix_before` e remove OSs sem histórico prévio.
   - **Expurgo das Tabelas Satélites:**
     - `DELETE FROM public.os_import_observations WHERE target_date = p_date;`
     - `DELETE FROM public.receivables WHERE date = p_date;`
     - `DELETE FROM public.ofx_balance_selections WHERE reconciliation_date = p_date;`
     - `DELETE FROM public.ofx_balance_selection_events WHERE reconciliation_date = p_date;`
     - `DELETE FROM public.daily_import_backups WHERE target_date = p_date;`
   - **Recálculo Canônico do Pátio:** Executa `recompute_patio_for_date_and_store(p_date, store_id)` para todas as filiais afetadas, garantindo que o fechamento e as visões executivas voltem à realidade.

---

## Skills Especializadas Aplicadas

- `database`: DDL idempotente, RPCs `SECURITY DEFINER`, RLS compatível e transações seguras.
- `backend-patterns`: Mutações atômicas, invalidação precisa de cache no React Query.
- `frontend-design-pro`: Feedback visual instantâneo e estados de loading nos seletores do wizard.

---

## Contratos de Dados

### 1. RPC `save_ofx_balance_rule`
```sql
save_ofx_balance_rule(
    p_account_key TEXT,
    p_source_kind TEXT,
    p_memo_normalized TEXT DEFAULT NULL,
    p_store_id TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT true,
    p_user_id TEXT DEFAULT NULL
) RETURNS JSONB
```

### 2. Tabela `patio_os_daily_backups`
```sql
CREATE TABLE IF NOT EXISTS public.patio_os_daily_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_date DATE NOT NULL,
    store_id TEXT NOT NULL,
    os_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_patio_os_daily_backups UNIQUE (target_date, store_id)
);
```

### 3. RPC `purge_daily_financial_data(p_date DATE)`
- Atualizada para incluir rollback de `patio_os`, remoção de `os_import_observations`, `receivables`, `ofx_balance_selections`, `patio_os_daily_backups` e recálculo de pátio.

---

## Arquivos Afetados

### [Arquivos Existentes Modificados]
1. `supabase/migrations/20260930000005_fix_ofx_balance_rule_and_daily_purge_reversion.sql` [NOVO]
2. `src/hooks/useOfxBalanceMappings.ts` [EDITAR]
3. `src/hooks/useImportProcessor.ts` [EDITAR]
4. `src/hooks/usePurgeDailyData.ts` [EDITAR]
5. `src/components/importacoes/CentralImportWizard.tsx` [EDITAR]

---

## Evidência e Decisão

| Caminho | Símbolo / Trecho | Decisão | Motivo | Verificação |
|---------|------------------|---------|--------|-------------|
| `supabase/migrations/...` | `save_ofx_balance_rule` | Criar | Evitar erro RLS 42501 em `ofx_balance_rules` para role anon | Teste SQL anon |
| `supabase/migrations/...` | `purge_daily_financial_data` | Editar/Evoluir | Reverter OSs e pátio para o estado pré-importação | Teste unitário e RPC |
| `useOfxBalanceMappings.ts` | `saveRuleMutation` | Editar | Delegar gravação de regra para a RPC `save_ofx_balance_rule` | Typecheck |
| `useImportProcessor.ts` | `savePatioOsAndReceivables` | Editar | Criar snapshot de backup em `patio_os_daily_backups` antes do update | Teste de importação |
| `usePurgeDailyData.ts` | `queryClient.invalidateQueries` | Editar | Invalidar queries de `patio_os`, `available_store_os`, `os_import_observations` | UI refresh |

---

## Plano de Rollback

- Reverter migration aplicando a versão anterior de `purge_daily_financial_data` de `20260821000009_purge_daily_financial_data.sql`.
- `git checkout HEAD -- src/` caso a implementação no frontend apresente divergência.

---

## Risco Principal

- **Risco:** Reverter OSs indevidamente em datas que não possuem backup.
- **Mitigação:** Se não houver backup ou observação comprovada para aquela data específica, o motor NÃO toca nas OSs históricas e emite aviso explícito no retorno da RPC.
