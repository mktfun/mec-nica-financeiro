# Spec-Plan: Fix Silent Drops in Import Wizard & Revert Diferença (331)

- [ ] **Step 1:** Modificar o frontend `src/components/importacoes/CentralImportWizard.tsx`.
  - [ ] Localizar e substituir `const realTxDate = tx.date ? tx.date.split('T')[0] : targetDate;` por `const realTxDate = targetDate;`.
  - [ ] Consertar a lógica de iteração de `r.items` (Rede) para não ignorar transações sem `sid`.
- [ ] **Step 2:** Gerar migration `20260901000008_fix_nulls_and_revert_diferenca.sql`.
  - [ ] `CREATE OR REPLACE FUNCTION get_daily_reconciliation_summary` com proteção `COALESCE` para o `transaction_type`.
  - [ ] Reverter o cálculo `diferenca` para refletir `Previsto - Realizado` (`rede_liquido - ofx_maquininhas`).
  - [ ] Reverter o `status` da loja para a margem `<= 0.05` dessa divergência.
- [ ] **Step 3:** Executar a migration diretamente via Node + `supabase-js` (Management/Service Role) para evitar erros do `db push`.
- [ ] **Step 4:** Validar com o usuário informando que ele deve refazer a importação de 01/09 (arrastar o OFX e o PDF/CSV da Rede novamente) para repovoar as tabelas corretamente com as datas padronizadas.
