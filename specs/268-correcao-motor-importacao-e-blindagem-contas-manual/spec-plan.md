# Spec Plan: Correção do Motor de Importação e Blindagem de Contas a Pagar (268)

## Tasks

- [ ] [BACKEND] Criar migration `20260824000003_filter_manual_bills_by_null_external_code.sql` para que `get_daily_reconciliation_summary` filtre estritamente `WHERE external_code IS NULL` em `daily_manual_bills` para as contas extras
- [ ] [BACKEND] Aplicar a migration no Supabase e validar a RPC
- [ ] [FRONTEND] Corrigir no `src/components/importacoes/CentralImportWizard.tsx` o cálculo de `saldo_bancario`, `saldo_negativo_itau` e `caixa_atual` para usar os saldos finais dos extratos OFX e a dedução do Itaú
- [ ] [DATA] Executar saneamento no banco para 24/08: remover duplicata da Rede em Santo André, inserir Pró-labore Daniel (R$ 10.070,00 com `external_code: null`) e sincronizar o snapshot com os valores periciais do Excel
- [ ] [TEST] Testar `get_daily_reconciliation_summary('2026-08-24')` garantindo `diferenca_final = 6.2` e `status_geral = 'approved'`
- [ ] [TEST] Executar `npm run build` para garantir zero erros de compilação
