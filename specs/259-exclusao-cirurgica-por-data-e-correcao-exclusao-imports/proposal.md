# Proposal: Exclusão Cirúrgica por Data & Correção do Botão de Excluir Imports (259)

## Problema
1. **Erro Fantasma no Botão de Excluir:** Na aba de histórico de importações (`/importacoes`), o botão de exclusão de lote remove registros do banco mas exibe um pop-up de erro (`alert()`) no final devido a falhas na chamada da RPC `delete_import_batch`, além de tentar deletar `patio_os` global da loja sem filtro por data.
2. **Impossibilidade de Resetar um Único Dia:** Quando o usuário deseja reimportar os arquivos de uma data específica (ex: `21/08/2026`), hoje só existe a opção de apagar um lote parcial ou clicar em "Limpar Todos os Dados" (que zera todo o banco e o Marco Zero). Falta uma opção de **Exclusão Cirúrgica por Data**, permitindo resetar 100% da conciliação daquele dia para reprocessá-la do zero com segurança.
3. **Ponto de Restauração / Checkpoint:** O usuário necessita de garantia de que seus dados do dia 21 estão salvos em um checkpoint antes de qualquer teste.

## Solução Proposta
1. **RPC Atômica de Exclusão Cirúrgica (`purge_daily_financial_data`):**
   - Cria uma RPC no PostgreSQL com `SECURITY DEFINER` que recebe `p_date DATE` e apaga de forma transacional e atômica:
     - `daily_snapshots` (do dia)
     - `reconciliations` (do dia)
     - `transactions` & `ofx_transactions` (do dia)
     - `conciliation_matches` (do dia)
     - `daily_manual_bills` (do dia)
     - `daily_revenue_adjustments` (do dia)
     - `reconciliation_audit_logs` (do dia)
     - `store_cash_vault` (do dia)
     - `accounts_payable_imports` (do dia)
     - `import_logs` (onde `target_date = p_date`)
   - Mantém 100% intactos os cadastros de lojas, marco zero e os demais dias do histórico.

2. **Correção do Hook `useDeleteImport` & `usePurgeDailyData`:**
   - Cria o hook `usePurgeDailyData()` conectado à nova RPC e integrado com feedback visual moderno (`Sonner toast`).
   - Corrige o `useDeleteImport` para eliminar o `alert()` nativo, validar o retorno de erros do Supabase e não apagar dados órfãos de outras datas.

3. **UI de Reset Cirúrgico no Fechamento Diário:**
   - Adiciona um botão/modal **"🗑️ Resetar Dados do Dia [Data]"** na tela de importações (`/importacoes`), com confirmação segura e seletor de data.
   - Permite ao usuário resetar apenas o dia `21/08/2026` com 1 clique e reexecutar a Central de Importação limpa.

4. **Checkpoint do Dia 21 Já Criado:**
   - Dados completos do dia 21/08/2026 foram salvos em `scratch/checkpoint_day_21_20260821.json`.
   - Script de restauração criado em `scratch/restore_checkpoint_day_21.cjs`.

## Contratos de Dados
- **Nova RPC Supabase:** `public.purge_daily_financial_data(p_date DATE)`
- **Tabelas afetadas na exclusão cirúrgica:**
  - `daily_snapshots` (`date = p_date`)
  - `reconciliations` (`date = p_date`)
  - `transactions` (`date = p_date OR target_date = p_date`)
  - `ofx_transactions` (`target_date = p_date`)
  - `conciliation_matches` (`target_date = p_date`)
  - `daily_manual_bills` (`date = p_date OR target_date = p_date`)
  - `daily_revenue_adjustments` (`date = p_date`)
  - `reconciliation_audit_logs` (`target_date = p_date`)
  - `store_cash_vault` (`entry_date = p_date`)
  - `accounts_payable_imports` (`date = p_date`)
  - `import_logs` (`target_date = p_date`)

## API / Interface
- `usePurgeDailyData`: Mutação com invalidação total de caches do React Query e notificação via `Sonner`.
- Componente `PurgeDailyModal.tsx` ou botão na barra de ações de `/importacoes`.

## Features Existentes Impactadas
- `src/routes/importacoes.tsx` (Central de Importação)
- `src/hooks/useImportProcessor.ts` (Hooks de importação e exclusão)
- `src/components/importacoes/CentralImportWizard.tsx`

## Risco Principal
- **Risco:** Apagar acidentalmente dados de outras datas se a data vier nula ou inválida.
- **Mitigação:** Validação rígida no frontend (formato `YYYY-MM-DD` obrigatório) e na RPC Postgres (`IF p_date IS NULL THEN RAISE EXCEPTION 'Data obrigatória'; END IF;`).
