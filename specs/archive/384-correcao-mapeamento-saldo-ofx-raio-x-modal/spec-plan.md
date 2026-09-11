# Spec Plan: Correção de Mapeamento de Saldo OFX no Modal Raio-X por Filial (Spec 384)

## Tasks de Implementação

### [FRONTEND] Blindagem e Multi-Alias em SaldoBancosDetailModal
- [x] Task 1: Atualizar a extração das propriedades de filial em [src/components/conciliacao/SaldoBancosDetailModal.tsx](file:///c:/Users/User/projects/mec-nica-financeiro/src/components/conciliacao/SaldoBancosDetailModal.tsx) com multi-alias defensivo (`saldo_banco_ofx`, `saldo_banco`, `saldo_bancos`, `saldo_banco_itau`, `saldo_total`, `dinheiro_lojas`, etc.).
- [x] Task 2: Ajustar a agregação de `totals` no modal para totalizar `ofxTotal`, `ofxPositivo`, `ofxNegativo` e garantir que o rodapé da coluna "Extrato OFX (Itaú)" exiba a soma exata das 10 filiais (R$ 135.706,55).
- [x] Task 3: Atualizar a interface `StoreReconciliationSummary` em [src/hooks/useBackendConciliacao.ts](file:///c:/Users/User/projects/mec-nica-financeiro/src/hooks/useBackendConciliacao.ts) com os tipos canônicos e aliases defensivos.

### [DATABASE] Enriquecimento do Contrato JSON da RPC
- [x] Task 4: Criar a migration `supabase/migrations/20260911000042_add_store_balance_aliases_to_rpc.sql` adicionando aliases explícitos `'saldo_banco_ofx'`, `'saldo_banco_itau'`, `'dinheiro_loja'` no `jsonb_build_object` da função `get_daily_reconciliation_summary`.
- [x] Task 5: Aplicar a migration no Supabase via script headless de execução de SQL.

### [VALIDATION] Build Gate & Visual QA
- [x] Task 6: Executar `npm run build` (Vite typecheck + build) garantindo zero erros de TypeScript.
- [x] Task 7: Executar script headless do Puppeteer abrindo o modal de Raio-X em `/conciliacao?date=2026-09-10`, capturar screenshot do modal aberto e auditar os R$ 135.706,55 na coluna Extrato OFX (Itaú) e no rodapé consolidado.
