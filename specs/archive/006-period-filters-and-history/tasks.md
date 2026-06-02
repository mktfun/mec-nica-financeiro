# Tasks (006-period-filters-and-history)

- [x] **1. Ajustar o hook do Pátio (`usePatio.ts`)**
  - [x] Adicionar suporte a `startDate` e `endDate` nos parâmetros.
  - [x] Modificar a query das "finalizadas" para buscar dentro deste range de datas.
- [x] **2. Atualizar a UI do Pátio (`patio.tsx`)**
  - [x] Adicionar estados de data (`startDate`, `endDate`) com default pro mês atual.
  - [x] Renderizar inputs de data na tela quando a aba "Finalizadas" estiver ativa.
  - [x] Renomear a aba para refletir que é do período.
- [x] **3. Implementar Modal de Histórico na Tela de Lojas**
  - [x] Criar modal ao clicar em uma loja.
  - [x] Fazer uma query na tabela `conciliations` e exibir o resultado das conciliações passadas.
- [x] **4. Reforçar o Padrão "Ontem" (D-1)**
  - [x] Vasculhar o projeto (Dashboard/Recebíveis) por instâncias de datas que não estejam usando o `getDefaultDate()` e substituí-las.
- [x] **5. Build & Test**
  - [x] Compilar, checar logs, testar filtros no Pátio.
