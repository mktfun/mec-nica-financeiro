# Spec Plan: Marco Zero Auto-Store Mapping (166)

## Tasks

- [x] [FRONTEND] Alterar a interface `MarcoZeroExtraction` em `marcoZeroParser.ts` substituindo `sheetName` por `storeName`.
- [x] [FRONTEND] Reescrever a lógica do `parseMarcoZeroPlanilha` para:
  - Iterar as abas ("SALDO", "OS").
  - Identificar os nomes das lojas na Coluna A.
  - Acumular saldos (Dinheiro MP, A Receber, Negativo, Caixa) num dicionário por `storeName` ao invés de variáveis globais da sheet.
  - Acumular OSs pendentes num array dicionário por `storeName`.
  - Mesclar ambos os dicionários para retornar a lista de lojas `MarcoZeroExtraction[]`.
- [x] [FRONTEND] Atualizar `MarcoZeroWizard.tsx` para mapear via `useEffect` a lista de extrações com o hook `useStores`.
- [x] [FRONTEND] Se `storeName` for similar ao nome da loja do DB (usando `.toLowerCase()` e limpeza simples), associar o `mapping[index] = store.id` automaticamente na montagem.
- [ ] [TEST] Verificar se o parse visual na tela mostra "Loja: Santo André" (ou similar) ao invés de "Aba: SALDO".
