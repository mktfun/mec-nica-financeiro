# Spec Plan: Previsto = Total Entradas OFX, Diferença = Pendentes Não Justificados + Correção do Auto-Match de PIX (Spec 275)

## Tasks

- [x] [BACKEND] Criar migração SQL `20260824000007_fix_store_previsto_and_unjustified_diff.sql` atualizando a RPC `get_daily_reconciliation_summary`:
  - `previsto_ofx` por loja = SUM(amount) de todas as entradas bancárias OFX no dia
  - `rede_in` por loja = SUM(amount) onde counterpart_name identifica adquirente (Rede, Cielo, Getnet, Stone, Redecard, Mastercard, Visa, Elo, PagSeguro)
  - `pix_os_in` por loja = SUM(amount) onde `matched_os_number IS NOT NULL` e não é adquirente
  - `justificado` por loja = SUM(amount) onde `manual_category IS NOT NULL`, sem OS vinculada e não é adquirente
  - `diferenca` = `previsto_ofx - (rede_in + pix_os_in + justificado)`
  - `status` = `'conciliado'` se `|diferenca| <= 0.05`, senão `'divergente'`
- [x] [BACKEND] Aplicar a migração no Supabase e validar com script de auditoria para todas as 10 filiais (dados de 24/08)
- [x] [FRONTEND] Corrigir guards do auto-match de PIX em `src/components/importacoes/CentralImportWizard.tsx` (bloco linhas ~720-748):
  - Guard 1: `tx.amount < 10.0` → skip (rendimentos e centavos nunca são pagamentos de OS)
  - Guard 2: `title/counterpart_name` contém `REND|APLIC|RESG|CDB|LCA|LCI|TESOURO|JUROS|IOF|AUT APR` → skip
  - Guard 3: `pixVal <= 0` → skip (só tenta casar OSs que TÊM valor de PIX esperado)
  - Guard 4: Reduzir tolerância de `< 1.0` para `< 0.10`
- [x] [FRONTEND] Verificar `isRedeTx()` em `StoreExtratoBancarioView.tsx` e garantir que usa os mesmos critérios da query do backend para classificar adquirentes
- [x] [TEST] Executar `npm run build` e validar compilação com zero erros TypeScript
