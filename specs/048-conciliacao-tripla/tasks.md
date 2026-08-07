# Tasks - ConciliaçÁo Tripla e Juros

## Backend Engineer
- [x] Criar a tabela `interest_rates` via migraçÁo do Supabase (com colunas `payment_method` varchar e `rate_percentage` numeric).
- [x] Adicionar políticas de RLS e atualizar as tipagens (`npx supabase gen types typescript --local`).

## Frontend Engineer
- [x] Editar a página `src/routes/configuracoes.tsx` para adicionar a UI de gerenciamento de Taxas/Juros.
- [x] Editar a página `src/routes/loja.$lojaId.tsx` (que mostra os detalhes de uma loja):
- [x] Criar a lógica do algoritmo "Triple Match" na tela de detalhes: Puxar transações da Loja, agrupar OS, Maquininha e OFX considerando a taxa de juros previamente cadastrada.
- [x] Desenhar o Data Grid ou Tabela com UI de alto padrÁo (Liquid Glass, Badges), que compare as 3 colunas e indique o `status` do match (Aprovado/Divergente).
