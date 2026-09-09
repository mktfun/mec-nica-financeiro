# Design: Correção da Âncora Temporal do Saldo OFX e Blindagem de Reconciliations (385)

## Arquitetura e Fluxo de Dados
Extratos OFX (.ofx) → `parseOFXFile` (extrai `<LEDGERBAL>` e `<DTASOF>`) → `CentralImportWizard.tsx` (passa `targetDate` explícito) → `useImportOFX` (`useTransactions.ts`) → `reconciliations` (grava `bank_total` na `targetDate`) → `SaldoBancosDetailModal` / `ResumoDiaPanel` (exibe saldos corretos das 10 lojas sem nenhum zero falso).

## Mutações em Arquivos Existentes [MODIFY]
1. `src/hooks/useTransactions.ts`:
   - Corrigir o loop `storeDates`:
   ```ts
   Object.keys(storeBankBalances).forEach(k => {
     storeDates.set(k, explicitTargetDate || txs[0]?.target_date || new Date().toISOString().split('T')[0]);
   });
   ```
2. `src/components/importacoes/CentralImportWizard.tsx`:
   - No upsert de pátio (linha ~1654), injetar `bank_total: storeBankBalances[sId]` se disponível, prevenindo criação de linhas com `bank_total = null`.
3. `supabase/migrations/20260909000042_fix_ofx_date_anchor_and_reconciliation_zeroed.sql`:
   - Atualizar os saldos de 09/09 no banco e adicionar fallback defensivo na RPC.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (4 Lojas Zeradas):** Abrir o modal Raio-X em 09/09 → Rudge Ramos (2.913,76), Santo André (2.171,16), Jabaquara (-4.252,96) e Kennedy (47.512,52) devem exibir seus saldos reais do OFX, com 0 lojas indevidamente zeradas.
- **Cenário 2 (Planalto e Integridade):** Planalto deve exibir -R$ 5.659,95 em conformidade centesimal com o extrato Itaú `brasicar.ofx`.
