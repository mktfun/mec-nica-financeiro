# Proposal: PaginaçÁo e RefatoraçÁo de Tabelas (013)

## Contexto e Problema
O usuário solicitou que as telas de "Carros no Pátio" (`patio.tsx`) e "Recebíveis" (`recebiveis.tsx`) sejam atualizadas para:
1. Conter paginaçÁo, melhorando a performance e usabilidade em grandes volumes de dados.
2. Utilizar o padrÁo de design visual (Extrato Timeline) que existe nas telas de Histórico e Detalhes da Loja (`loja.$lojaId.tsx`), substituindo o padrÁo atual de `<table>` por uma lista de `motion.div` com flexbox, ícones arredondados e detalhes em badges (`<Badge>`, ícones Lucide).

## Requisitos e User Stories
- **Eu como usuário**, quero navegar pelas páginas de Carros no Pátio e Recebíveis de forma paginada para nÁo ter uma tela excessivamente longa.
- **Eu como usuário**, quero visualizar os itens com o mesmo nível de polimento visual do Extrato Bancário (ícones circulares, flex layout, hover effects, valores em destaque).

## O que já existe e será reutilizado
- **PadrÁo Visual Timeline**: O padrÁo utilizado em `src/routes/loja.$lojaId.tsx` para listar as transações.
- **PadrÁo de PaginaçÁo**: A lógica de `pageSize = 8` com os botões de controle de página ("Anterior", "Próxima") já aplicada em `loja.$lojaId.tsx`.
- **Componentes**: `AnimatedNumber`, `Badge`, ícones do `lucide-react`.
- **Hooks**: `usePatioOS` e `useRecebiveis` já buscam e filtram os dados com sucesso, a lógica de negócio já está correta.

## O que precisa ser criado/alterado
- Em `patio.tsx`, substituir a `<table>` pela lista estilo Timeline e adicionar o estado/controles de `page`.
- Em `recebiveis.tsx`, substituir a `<table>` pela lista estilo Timeline e adicionar o estado/controles de `page`.
- Ajustar os filtros e abas para sempre resetarem a página atual (`setPage(1)`) ao serem alterados.

## Critérios de Aceite
1. As tabelas originais HTML (com `thead`, `tr`, `td`) em `patio.tsx` e `recebiveis.tsx` nÁo devem mais existir.
2. A nova listagem deve usar o padrÁo `divide-y`, com flexbox e ícones representando o status/tipo.
3. A paginaçÁo deve funcionar com limite de 8 ou 10 itens por página.
4. As abas e buscas nÁo devem quebrar a paginaçÁo.
