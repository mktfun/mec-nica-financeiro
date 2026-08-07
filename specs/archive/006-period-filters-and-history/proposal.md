# Proposal: Filtros de Período e Histórico de Movimentações (006)

## Contexto
O usuário relatou que a interface atual restringe a visualização de OSs finalizadas apenas ao dia de hoje (ou dia selecionado no filtro). Além disso, há uma necessidade de auditar e verificar os detalhes (histórico) das conciliações de cada loja, para entender como os valores foram compostos. Por fim, o cliente quer garantir que TODA a lógica e cálculos do sistema, por padrão, olhem sempre para o "dia anterior" (D-1), ou invés do dia em que se acessa a ferramenta, e que as listas permitam filtros por Mês corrente.

## Requisitos e User Stories
1. **Filtro de Período (Pátio e Recebíveis):** 
   - A aba "Finalizadas Hoje" no Pátio deve virar "Finalizadas no Período".
   - Por padrão, o filtro deve cobrir do 1º dia do mês atual até o último dia do mês atual.
   - O usuário deve poder alterar as datas de Início e Fim para ver outros meses.
2. **Lógica D-1 Universal:** 
   - Reforçar que os cálculos de resumo diário de Recebíveis/Lojas e o pré-set de datas sempre caiam no dia útil anterior (se hoje for Segunda, trazer Sábado. Se hoje for dia 01/06, o padrão de conciliação cai em 31/05 ou dia útil válido). 
   - *Nota:* A função `getDefaultDate` já faz D-1 pulando domingos, mas revisaremos todas as queries de backend/hooks para garantir que ela seja a fonte da verdade de "hoje" pro sistema.
3. **Histórico/Detalhes da Loja:** 
   - Adicionar uma forma de visualizar as movimentações e conciliações detalhadas de uma loja específica.
   - Uma lista de histórico que mostre: Data, Entradas (OS Faturado), Entradas de Recebíveis (Cartão caindo na conta hoje) e Resultado da Conciliação.

## O que já existe
- Telas de Pátio, Recebíveis, Lojas e Conciliação.
- O componente `Modal` recém implementado.
- Os hooks `usePatio`, `useReceivables`, `useStores`, `useConciliacao`.
- A função `getDefaultDate()` em `utils.ts` (já está programada para ontem, mas precisa ser acoplada adequadamente no restante dos filtros).

## O que será criado
- **UI:** 
  - Dois campos de Data (Início e Fim) no topo do Pátio para as "Finalizadas".
  - Na tela de "Lojas" (ou Conciliação), um modal de "Histórico da Loja" ao clicar nela, listando os registros de fechamento passados.
- **Backend:** 
  - Ajuste nos parâmetros dos hooks para suportar um `startDate` e `endDate` nas buscas de OSs finalizadas, ao invés de buscar apenas por um `targetDate` cravado.

## Critérios de Aceite
1. Entrar no Pátio e clicar em "Finalizadas" deve mostrar as OSs do mês inteiro (ex: 01/06 a 30/06).
2. O "Dia Padrão" ao abrir modais de importação ou conciliação deve continuar retroativo.
3. Será possível clicar em uma Loja e ver as movimentações recentes importadas nela.
