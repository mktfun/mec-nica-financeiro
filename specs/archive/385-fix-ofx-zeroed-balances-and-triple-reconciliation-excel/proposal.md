# Proposal: Correção da Âncora Temporal do Saldo OFX, Blindagem de Upsert e Sincronização Tríplice (385)

## Problema
1. **4 Filiais Zeradas no Raio-X (`R$ 0,00`):** Na conciliação do dia 09/09, as filiais Rudge Ramos, Santo André, Jabaquara e Kennedy não registraram movimentações de crédito/débito no dia 09/09 (apenas lançamentos de 08/09). A função `useImportOFX` (`useTransactions.ts`) associou a data do saldo à data da última transação (`2026-09-08`). Posteriormente, o salvamento de pátio em `CentralImportWizard.tsx` gravou uma linha em `reconciliations` para `2026-09-09` com `bank_total` nulo, fazendo com que a UI exibisse `R$ 0,00`.
2. **Divergência de R$ 2.000,00 em Planalto:** O print do sistema indicou `-R$ 5.659,95` (idêntico ao saldo real `<LEDGERBAL>` do extrato oficial do Itaú `brasicar.ofx`), enquanto a planilha Excel possuía o valor digitado manualmente de `-R$ 7.659,95`.
3. **Mistura de Conceitos no Excel:** Em filiais como Mauá, Rudge Ramos e Santo André, a planilha manual somou saldo bancário com recebíveis de cartão, gerando ilusão de divergência contábil.

## Solução Proposta (Foco em Reuso e Correção)
1. **[MODIFY] `src/hooks/useTransactions.ts`:**
   - Na mutação `useImportOFX`, garantir que o `bank_total` de cada loja seja registrado obrigatoriamente na `targetDate` informada na importação (ou na data oficial da tag `<DTASOF>` do extrato), e não na data isolada da última transação.
2. **[MODIFY] `src/components/importacoes/CentralImportWizard.tsx`:**
   - No Step 8 (salvamento de pátio em `reconciliationsToUpsert`), garantir que o upsert não zere nem sobrescreva `bank_total`. Passar o `bank_total` já conhecido da loja ou utilizar update atômico.
3. **[MODIFY] `supabase/migrations/20260909000042_fix_ofx_date_anchor_and_reconciliation_zeroed.sql`:**
   - Script SQL com backfill imediato das 4 lojas zeradas no dia 09/09 com os saldos dos arquivos OFX:
     - Rudge Ramos: R$ 2.913,76
     - Santo André: R$ 2.171,16
     - Jabaquara: -R$ 4.252,96
     - Kennedy: R$ 47.512,52
   - Ajuste na RPC `get_daily_reconciliation_summary` para que, se `bank_total` for nulo em uma filial ativa, busque como fallback seguro o último saldo bancário conhecido de dia útil anterior.

## Contratos de Dados & SQL (Supabase)
- Nenhuma tabela nova criada.
- Reuso estrito de `reconciliations`, `ofx_transactions` e `daily_reconciliations`.

## Risco Principal e Mitigação
- **Risco:** Reimportar o OFX sobrescrever dados consolidados de datas passadas.
- **Mitigação:** Travar a gravação do saldo estritamente na `targetDate` selecionada no Wizard.
