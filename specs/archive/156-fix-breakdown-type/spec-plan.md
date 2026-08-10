# Spec Plan: Fix Breakdown Types and Regressions (156)

## Tasks

- [x] [FRONTEND] Atualizar interface de tipagem do arquivo `src/hooks/useConciliationBreakdown.ts` para comportar a nested structure (`ofx_in.transactions` etc).
- [x] [FRONTEND] Refatorar `src/components/conciliacao/BreakdownModal.tsx` substituindo chamadas como `data.ofx_in.length` e `data.ofx_in.map` pela nova interface (adicionando verificação optional chaining `.transactions?.map`).
- [x] [FRONTEND] Ajustar as referências dos totais nas badges e cabeçalhos do `BreakdownModal.tsx` de `data.ofx_in_total` e `data.na_loja_os` para `data.ofx_in.total` e `data.na_loja.total`.
- [x] [TEST] Verificar cenário 1: Realizar um mock ou build e validar que a listagem de componentes renderiza com TypeScript semântico 100% válido.
