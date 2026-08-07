# Spec Plan: O Mistério do PIX Fantasma (095)

## Tasks

- [x] [BACKEND] Editar `src/hooks/useConciliacao.ts`
  - Localizar a declaração de `ofxPixTxs` (por volta da linha 619).
  - Remover a lógica que força o `t.title` a conter `PIX`, `TED`, `TRANSF` ou `DOC`.
  - Deixar o filtro apenas retornando `true` para todas as transações que passarem pela checagem inicial (`t.source === 'ofx'` e `t.type === 'in'`).
- [x] [FRONTEND] Editar `src/routes/conciliacao.index.tsx`
  - Localizar o cálculo do Faturamento (por volta da linha 74).
  - Substituir a leitura de `storeMod1?.pix_os` por `storeMod1?.faturamento_real_ofx`.
  - O cálculo passará a ser matematicamente cego a textos e 100% ancorado ao banco de dados: `faturamento = maquininha + (storeMod1?.faturamento_real_ofx || 0)`.
