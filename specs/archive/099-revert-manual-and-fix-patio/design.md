# Design: Fix de Escopo e Automação (099)

## 1. `useConciliacao.ts`
Na linha que busca a âncora histórica do pátio:
```typescript
// DE:
const storeRecon = reconciliations?.find(r => r.store_id === store.id && Number(r.na_loja_os) > 0);

// PARA:
const storeRecon = reconciliations?.find(r => r.store_id === store.id && r.date === date);
```
Isso força a correspondência exata de data, impedindo que dados do dia 25 apareçam no dia 28.

## 2. `ResumoDiaPanel.tsx`
- **Remover** estado `manualCaixaAnterior` e o JSX do `<input>`.
- **Refatorar** `caixaAnteriorGlobal`:
```typescript
// DE: 
const caixaAnteriorGlobal = sumOfxPreviousBalance > 0 ? sumOfxPreviousBalance : (previousSnapshot?.caixa_atual || 0);

// PARA:
const caixaAnteriorGlobal = previousSnapshot?.caixa_atual || 0;
```
A responsabilidade de saber o Caixa Anterior fica restrita 100% à engine do `usePreviousDaySnapshot`, tornando o processo totalmente automático.
