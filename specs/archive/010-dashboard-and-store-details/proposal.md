# Proposal: Correções do Dashboard e Fluxo de Histórico (010)

## Contexto e Problema
O usuário relatou dois problemas principais com a visualização dos dados e a navegação:
1. **Valores Zerados no Dashboard**: O Dashboard e a tela de Conciliação exibem "Entradas do Dia" e "Saldo Líquido" totalmente zerados, mesmo após importar dezenas de milhares de reais em OSs. Isso ocorre porque o Dashboard foi originalmente construído para buscar apenas as conciliações e pagamentos do dia atual (D0). Como as planilhas importadas contêm dados de dias anteriores, o filtro "somente hoje" resulta em zero.
2. **Navegação Quebrada no Grid de Lojas**: Na tela inicial e de conciliação, ao clicar no card de uma loja para "ver detalhes", o sistema redireciona o usuário para a página genérica `/lojas` em vez de abrir o painel detalhado de histórico daquela loja. Além disso, o usuário deseja que esse detalhamento contenha as "entradas e saídas" (o novo Extrato), não apenas a tela de cadastro da loja.

## O Que Já Existe e Será Reutilizado
- `useTransactions.ts` -> O hook `useDashboardSummary` que alimenta o *HeroBalance* e os cards de resumo.
- `src/routes/conciliacao.tsx` -> Onde o grid de lojas está implementado.
- `src/routes/index.tsx` -> O Dashboard principal que exibe a *RecentActivity*.
- `src/components/dashboard/StoreDetailsSheet.tsx` -> Modal lateral (Sheet) que antes era usado na tela de Lojas e que exibe o resumo de conciliação.
- `src/routes/historico.tsx` -> A nova tela de Extrato Bancário.

## O Que Será Feito
1. **Refatorar o Resumo do Dashboard (Mês em vez de Dia)**:
   - Alterar `useDashboardSummary` para calcular o faturamento e saldo líquido baseado no mês atual (do dia 1 ao dia 31) ou no acumulado total, utilizando a tabela `transactions`. 
   - Atualizar a UI para deixar claro que o valor reflete o "Mês Atual" em vez de "Hoje" (para que faça sentido com os lotes importados).

2. **Corrigir o Clique do Grid de Lojas**:
   - Remover o `<Link to="/lojas">` dos cards em `conciliacao.tsx`.
   - Adicionar o estado local (ex: `selectedStoreId`) e renderizar o componente `<StoreDetailsSheet />` diretamente na página de Conciliação, para que o modal lateral se abra imediatamente ao clicar no card.
   - Adicionar um botão no `StoreDetailsSheet` chamado "Ver Extrato Completo" que direciona o usuário para a rota `/historico`, facilitando o acesso direto às "entradas e saídas" daquela loja específica.

## Critérios de Aceite
- O Dashboard (HeroBalance e cards de "Saldo Líquido") deve refletir os valores das OSs importadas (soma do mês ou acumulado) e não ficar R$ 0,00.
- Clicar em uma loja no grid "10 Lojas" deve abrir um *Slide-over/Modal* com o resumo financeiro da loja, sem navegar para a página de gestão de lojas.
