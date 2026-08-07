# Design: Stop Maquininha Duplication (081)

## Arquitetura Técnica
`CentralImportWizard` (React Component) -> `txsToInsert` Array -> `useBulkInsertTransactions` -> Tabela `transactions`.
A arquitetura nÁo muda, apenas a montagem do array.

## Interfaces TypeScript
Nenhuma interface nova.

## Componentes / Hooks / Funções
- `src/components/importacoes/CentralImportWizard.tsx`: 
  - Remover as iterações `results.maquininhaItems.forEach(...)` e `Array.from(uniqueRedeTxs.values()).forEach(...)` que dÁo `.push()` no `txsToInsert`.

## Fluxo de UI
Transparente para o usuário. O Wizard continua dizendo que gravou o batch, mas o contador exibirá o número exato de transações OFX (em vez do dobro).

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Importar Maquininha + OFX → Dashboard (Faturamento Atual) → O Faturamento nÁo dobra, e a tela de ConciliaçÁo lista os cartões sem duplicidade com o extrato.
