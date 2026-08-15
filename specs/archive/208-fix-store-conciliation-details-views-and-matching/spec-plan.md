# Spec Plan: 208-fix-store-conciliation-details-views-and-matching

## Tasks

- [x] [HOOK] Em `src/hooks/useConciliacao.ts` (`useReconciliationViews`), migrar a busca de OSs de `estoque_os_pendente` para `patio_os`.
- [x] [HOOK] Em `src/hooks/useConciliacao.ts`, alimentar `osVsRede` com `gross_amount` para Bruto, `fee_amount` para Taxas e `amount` para Líquido, além de pareamento inteligente com OSs de cartão (`credit_value` / `debit_value`).
- [x] [HOOK] Em `src/hooks/useConciliacao.ts`, alimentar `redeVsOfx` e `pixVsOfx` com identificação real de depósitos bancários de maquininha e transferências PIX.
- [x] [UI] Em `src/components/conciliacao/OsVsRedeTable.tsx`, exibir número de OS formatado com cliente e placa, faturamento sistema real e cálculo do delta.
- [x] [UI] Em `src/components/conciliacao/RedeVsOfxTable.tsx`, calcular e exibir cards de Bruto, Taxas e Líquido corretamente, além de status amigável de entrada no OFX.
- [x] [UI] Em `src/components/conciliacao/PixVsOfxTable.tsx`, exibir cards consolidados de PIX e tabela detalhada de OSs pagas com PIX vs Extrato Bancário.
- [x] [UI] Em `src/components/conciliacao/OfxSemMatchTable.tsx`, listar entradas bancárias avulsas não associadas com design limpo e moderno.
- [x] [TEST] Executar `cmd.exe /c "npm run build"` para validação técnica com 0 erros.
