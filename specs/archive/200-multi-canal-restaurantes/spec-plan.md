# Spec Plan 200 (Simplificada)

- `[x]` 1. **SQL Migration**: Adicionar colunas necessárias na tabela `stores` (`pedidos_mesa`, `pedidos_ifood`, `pedidos_99`, `pedidos_keeta`, `custo_fixo_salao`, `custo_fixo_delivery`).
- `[x]` 2. **Remoção de Complexidade**: Excluir a abordagem engessada de tabelas analíticas (`faturamento_diario`, etc) e as duas telas criadas para seguir a ordem do usuário: adaptar o que já existia.
- `[x]` 3. **API / Frontend - Configurações Centralizadas**: Adicionar os novos inputs de volume mensal e divisão de custos fixos na tela já existente `/configuracoes`.
- `[x]` 4. **Integração Financeiro 360º**: Modificar a tabela de `financeiro.tsx` para realizar a matemática do Rateio Multi-Canal puramente no Client-Side utilizando as variáveis injetadas na tabela `stores`.
