# Design: Fix Silent Drops in Import Wizard & Revert Diferença (331)

## Arquitetura e Fluxo de Dados
Arquivo OFX e Rede → `CentralImportWizard` (Frontend) → `Supabase (pos_transactions / ofx_transactions)` → `get_daily_reconciliation_summary` (Backend) → `ConciliacaoLojasView` (Dashboard UI)

## Mutações em Arquivos Existentes [MODIFY]
- `src/components/importacoes/CentralImportWizard.tsx`:
  - `const realTxDate = targetDate; // Força a data alvo da conciliação`
  - Remoção de drops de transações da Rede: permitir que `sid` seja mapeado ou retorne GLOBAL, e realizar o `push` para `redeByStore` adequadamente sem o bloco restritivo `if (sid)`.
- `supabase/migrations/20260901000008_fix_nulls_and_revert_diferenca.sql`:
  - Envolver `transaction_type` com `COALESCE(..., '') != 'devolucao'` na CTE `rede_agg`.
  - Reverter `diferenca` para `(COALESCE(rd.rede_liquido, 0) + COALESCE(px.pix_total, 0)) - (COALESCE(o.ofx_maquininhas, 0) + COALESCE(px.pix_total, 0))` (reduzido a `rede_liquido - ofx_maquininhas`).
  - Atualizar o `status` para basear-se nessa divergência (`ABS(rede_liquido - ofx_maquininhas) <= 0.05`).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Importação OFX fim de semana):** Fazer upload de OFX com transação de 31/08 no dia 01/09 → o banco salva com `target_date = 01/09` → Extrato exibe a transação corretamente.
- **Cenário 2 (Maquininha):** Fazer upload do arquivo da Rede → wizard não descarta transações → banco salva em `pos_transactions` → RPC exibe Maquininha correta e calcula a Diferença corretamente se o OFX não bater.
