# Spec Plan: Fix OFX Target Date Accumulation (082)

## Tasks

- [ ] [FRONTEND] Editar `src/components/importacoes/CentralImportWizard.tsx` (linha ~316) para que o `target_date` das transações de OFX seja `tx.date ? tx.date.split('T')[0] : targetDate`.
- [ ] [FRONTEND] Editar `src/components/conciliacao/ResumoDiaPanel.tsx` (linha ~216) para que o `AnimatedNumber` do "SALDO BANCO ITAÚ" use `value={totalBancarioRaw}` ao invés de `calculated.saldo`.
- [ ] [FRONTEND] Editar `src/components/conciliacao/ResumoDiaPanel.tsx` (linha ~218) para mudar a label "Extrato bancário OFX global" para "Saldo real da conta".
- [ ] [TEST] Re-fazer a build ou rodar verificação local para garantir ausência de erros TypeScript.
