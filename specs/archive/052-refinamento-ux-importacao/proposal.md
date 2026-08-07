# Proposal: Refinamento UX da Importação Central (052)

## Contexto
O usuário relatou que a tela de Importações se tornou confusa após a introdução da "Central de Importação", pois os botões e categorias antigos ainda estão lá, gerando redundância visual e cognitiva. Além disso, o mapeamento de lojas para OFXs não identificados exibe apenas "BANCO DESCONHECIDO - Conta", impedindo o usuário de reconhecer de qual loja/conta se trata.

## Objetivos
1. **Unificação Real:** Simplificar `importacoes.tsx`, removendo o grid de opções "Selecione uma Categoria" e promovendo a Central de Importação como fluxo único.
2. **Contexto de Mapeamento:** Adicionar metadados (nome do arquivo e amostra das 2 primeiras transações) na interface de Mapeamento de Loja no Passo 2 do Wizard, resolvendo a ambiguidade do "BANCO DESCONHECIDO".
