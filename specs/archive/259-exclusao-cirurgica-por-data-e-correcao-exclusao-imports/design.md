# Design: Exclusão Cirúrgica por Data & Correção do Botão de Excluir Imports (259)

## Arquitetura Técnica

```
[UI: Botão "Resetar Dados do Dia"]
          │
          ▼
[Modal de Confirmação com Seletor de Data]
          │
          ▼
[Hook: usePurgeDailyData]
          │
          ▼
[Supabase RPC: purge_daily_financial_data(p_date)]
          │
    ┌─────┴──────────────────────────────────────┐
    │ Transação Atômica PostgreSQL:              │
    │ 1. DELETE FROM daily_snapshots             │
    │ 2. DELETE FROM reconciliations             │
    │ 3. DELETE FROM transactions / ofx_trans... │
    │ 4. DELETE FROM conciliation_matches        │
    │ 5. DELETE FROM daily_manual_bills          │
    │ 6. DELETE FROM daily_revenue_adjustments   │
    │ 7. DELETE FROM reconciliation_audit_logs   │
    │ 8. DELETE FROM store_cash_vault            │
    │ 9. DELETE FROM accounts_payable_imports    │
    │ 10. DELETE FROM import_logs                │
    └────────────────────────────────────────────┘
          │
          ▼
[Invalidação do React Query Cache + Toast Sonner]
```

## Interfaces TypeScript & RPC SQL

### Migration SQL (`20260821000009_purge_daily_financial_data.sql`):
```sql
CREATE OR REPLACE FUNCTION purge_daily_financial_data(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count_snapshots INT;
  v_count_reconciliations INT;
  v_count_transactions INT;
  v_count_ofx INT;
  v_count_matches INT;
  v_count_bills INT;
  v_count_adjustments INT;
  v_count_logs INT;
BEGIN
  IF p_date IS NULL THEN
    RAISE EXCEPTION 'Data de exclusão é obrigatória.';
  END IF;

  DELETE FROM public.daily_snapshots WHERE date = p_date;
  GET DIAGNOSTICS v_count_snapshots = ROW_COUNT;

  DELETE FROM public.reconciliations WHERE date = p_date;
  GET DIAGNOSTICS v_count_reconciliations = ROW_COUNT;

  DELETE FROM public.conciliation_matches WHERE target_date = p_date;
  GET DIAGNOSTICS v_count_matches = ROW_COUNT;

  DELETE FROM public.transactions WHERE date = p_date OR target_date = p_date;
  GET DIAGNOSTICS v_count_transactions = ROW_COUNT;

  DELETE FROM public.ofx_transactions WHERE target_date = p_date;
  GET DIAGNOSTICS v_count_ofx = ROW_COUNT;

  DELETE FROM public.daily_manual_bills WHERE date = p_date OR target_date = p_date;
  GET DIAGNOSTICS v_count_bills = ROW_COUNT;

  DELETE FROM public.daily_revenue_adjustments WHERE date = p_date;
  GET DIAGNOSTICS v_count_adjustments = ROW_COUNT;

  DELETE FROM public.reconciliation_audit_logs WHERE target_date = p_date;

  DELETE FROM public.store_cash_vault WHERE entry_date = p_date;

  DELETE FROM public.accounts_payable_imports WHERE date = p_date;

  DELETE FROM public.import_logs WHERE target_date = p_date;
  GET DIAGNOSTICS v_count_logs = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'date', p_date,
    'deleted_snapshots', v_count_snapshots,
    'deleted_reconciliations', v_count_reconciliations,
    'deleted_transactions', v_count_transactions,
    'deleted_ofx', v_count_ofx,
    'deleted_matches', v_count_matches,
    'deleted_bills', v_count_bills,
    'deleted_adjustments', v_count_adjustments,
    'deleted_logs', v_count_logs
  );
END;
$$;
```

## Componentes / Hooks / Funções
1. **`src/hooks/usePurgeDailyData.ts` (NOVO):**
   - Executa a RPC `purge_daily_financial_data`.
   - Limpa e invalida todos os caches de fechamento, extrato, logs e snapshot.
   - Mostra toast de sucesso com o total de itens removidos.
2. **`src/components/importacoes/PurgeDailyModal.tsx` (NOVO):**
   - Modal com seletor de data (default na data atual ou selecionada), aviso visual de confirmação e botão de exclusão cirúrgica.
3. **`src/routes/importacoes.tsx` (MODIFICAR):**
   - Adicionar botão **"Resetar Dia"** no cabeçalho.
   - Corrigir `handleDelete` do histórico de lotes para não disparar `alert()` e usar `toast`.
4. **`src/hooks/useImportProcessor.ts` (MODIFICAR):**
   - Ajustar `useDeleteImport` para evitar remoção incorreta de dados órfãos e capturar erros silenciosamente.

## Cenários de Verificação
- **Cenário 1 (Reset do Dia 21/08/2026):**
  - Usuário clica em "Resetar Dia" ➔ Seleciona `2026-08-21` ➔ Confirma.
  - O sistema limpa todas as transações, snapshot, audit logs e reconciliations de 21/08/2026.
  - As lojas, os dados do dia 20 e o Marco Zero continuam 100% intactos.
  - A tela de importação fica zerada e pronta para receber o `BuscaContasAPagar (1).xls` e arquivos OFX novamente.
- **Cenário 2 (Restauração por Checkpoint de Emergência):**
  - Se algo der errado, executar `node scratch/restore_checkpoint_day_21.cjs`.
  - Todos os 10 logs de importação, 58 transações OFX, 19 matches e 1 snapshot retornam exatamente como estavam.
- **Cenário 3 (Exclusão Individual no Histórico de Imports):**
  - Clicar na lixeira de um lote no histórico.
  - O lote é removido e a mensagem de sucesso aparece via toast moderno, sem erro de pop-up.
