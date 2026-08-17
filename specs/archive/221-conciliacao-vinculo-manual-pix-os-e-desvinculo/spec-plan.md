# Spec Plan: Vínculo Manual de PIX/Banco com OS, Desvinculação e Proteção contra Duplicidade no Faturamento (221)

## Tasks

- [ ] [FRONTEND/HOOKS] Criar hook `src/hooks/useManualMatch.ts` para vincular transações a OSs e desvincular matches existentes no Supabase (`transactions`, `ofx_transactions`, `patio_os`).
- [ ] [FRONTEND/HOOKS] Atualizar `src/hooks/useJustifiedTransactions.ts` para excluir transações com `matched_os_number` (garantindo que pagamentos de OS não somem no Faturamento Atual).
- [ ] [FRONTEND/COMPONENTS] Criar modal `src/components/conciliacao/ManualMatchOsModal.tsx` para busca e vínculo direto de qualquer transação bancária/PIX com as OSs da loja.
- [ ] [FRONTEND/COMPONENTS] Atualizar `src/components/conciliacao/PixVsOfxTable.tsx`:
  - Adicionar ação de "Vincular Transação Bancária" para OSs pendentes.
  - Adicionar ação de "Desvincular" para OSs pareadas incorretamente.
- [ ] [FRONTEND/COMPONENTS] Atualizar `src/components/conciliacao/OfxSemMatchTable.tsx`:
  - Adicionar botão "Vincular à OS" ao lado de "Justificar Avulso".
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros de compilação.
- [ ] [VERIFY] Validar fluxo de vínculo manual, desvinculação e proteção contra duplicidade no Faturamento Atual.
