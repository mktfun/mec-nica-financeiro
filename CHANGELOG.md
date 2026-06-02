# Changelog

Histórico de atualizações e especificações implementadas no sistema.

## [2026-06-02]
- **[017-fechamento-caixa]** Fechamento de Caixa Físico implementado e arquivado. O sistema agora separa transações em "Dinheiro" do extrato bancário, criando registros de "Caixa Físico" que aguardam contagem manual e cálculo de divergência.
- **[016-store-dashboard-cleanup]** Melhorias no dashboard da Loja implementadas e arquivadas. Adicionada exibição de transações sem OS, melhoria nas badges de método de pagamento no extrato e limpeza visual da UI.
- **[015-juros-progressivos]** Refatoração da lógica de juros implementada e arquivada. O motor de extração de taxa da máquina de cartão agora é uma função utilitária global.
