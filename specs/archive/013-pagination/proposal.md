# Proposal: Paginação e Refatoração de Tabelas (013)

## Contexto e Problema
O usuário solicitou que as telas de "Carros no Pátio" (`patio.tsx`) e "Recebíveis" (`recebiveis.tsx`) sejam atualizadas para:
1. Conter paginação, melhorando a performance e usabilidade em grandes volumes de dados.
2. Utilizar o padrão de design visual (Extrato Timeline) que existe nas telas de Histórico e Detalhes da Loja (`loja.$lojaId.tsx`), substituindo o padrão atual de `<table>` por uma lista de `motion.div` com flexbox, ícones arredondados e detalhes em badges (`<Badge>`, ícones Lucide).

## Requisitos e User Stories
- **Eu como usuário**, quero navegar pelas páginas de Carros no Pátio e Recebíveis de forma paginada para não ter uma tela excessivamente longa.
- **Eu como usuário**, quero visualizar os itens com o mesmo nível de polimento visual do Extrato Bancário (ícones circulares, flex layout, hover effects, valores em destaque).

## O que já existe e será reutilizado
- **Padrão Visual Timeline**: O padrão utilizado em `src/routes/loja.$lojaId.tsx` para listar as transações.
- **Padrão de Paginação**: A lógica de `pageSize = 8` com os botões de controle de página ("Anterior", "Próxima") já aplicada em `loja.$lojaId.tsx`.
- **Componentes**: `AnimatedNumber`, `Badge`, ícones do `lucide-react`.
- **Hooks**: `usePatioOS` e `useRecebiveis` já buscam e filtram os dados com sucesso, a lógica de negócio já está correta.

## O que precisa ser criado/alterado
- Em `patio.tsx`, substituir a `<table>` pela lista estilo Timeline e adicionar o estado/controles de `page`.
- Em `recebiveis.tsx`, substituir a `<table>` pela lista estilo Timeline e adicionar o estado/controles de `page`.
- Ajustar os filtros e abas para sempre resetarem a página atual (`setPage(1)`) ao serem alterados.

## Critérios de Aceite
1. As tabelas originais HTML (com `thead`, `tr`, `td`) em `patio.tsx` e `recebiveis.tsx` não devem mais existir.
2. A nova listagem deve usar o padrão `divide-y`, com flexbox e ícones representando o status/tipo.
3. A paginação deve funcionar com limite de 8 ou 10 itens por página.
4. As abas e buscas não devem quebrar a paginação.
