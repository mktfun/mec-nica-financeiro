# Design

## UI/UX
- `/importacao` -> `ImportWizard.tsx` (Stepper).
- `/loja/$lojaId` -> Tabs reorganizadas: Extrato | Saídas | Entradas | Caixa Físico.

## Logic (Parser)
- OFX parser filtrará transações para focar no fluxo de "Despesas" explícitas e "Recebimentos" de maquininha do D+1.
- `useImportProcessor.ts` agrupará dados cruzando Identificadores de Venda da Maquininha com os Valores.
