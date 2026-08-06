# Spec Plan: Fix de Pátio e Caixa (099)

## Tasks

- [x] [ENGINE] Editar `src/hooks/useConciliacao.ts`
  - Alterar `.find(r => r.store_id === store.id && Number(r.na_loja_os) > 0)` para checar `r.date === date`.
- [x] [FRONTEND] Editar `src/components/conciliacao/ResumoDiaPanel.tsx`
  - Remover `manualCaixaAnterior` do `useState`.
  - Remover `<input>` de edição manual.
  - Alterar `caixaAnteriorGlobal` para ignorar `sumOfxPreviousBalance` e usar estritamente `previousSnapshot?.caixa_atual || 0`.
  - Passar `caixaAnteriorGlobal` puro para a Engine.
