# Changelog

Histórico de atualizações e especificações implementadas no sistema.

## [2026-06-02]
- **[002-saldo-consolidado]** Refatoração da inteligência temporal do Saldo Líquido Consolidado implementada e arquivada. O Saldo Líquido Global agora representa o valor All-Time de todas as contas, enquanto as métricas de receita/despesa se mantêm vinculadas ao filtro mensal.
- **[001-ui-ux-refinements]** Refinamentos visuais aplicados e arquivados. Adição do Month Picker, reorganização do layout de Lojas, fim da altura estática e aprimoramento estético geral (Liquid Glass).
- **[020-import-management]** Interface de Gerenciamento de Importações e Deleção em Cascata implementadas. Adicionada tela para listar planilhas importadas e função para desfazer importações com segurança (limpando o extrato, conciliação, recebíveis e pátio associados à data). Bug de data "31" que causava loop infinito de carregamento no PostgreSQL corrigido.
- **[019-os-history]** Histórico de Ordens de Serviço (OS) e correção de espaçamento de layout implementados e arquivados. Foi adicionada uma timeline de histórico para tracking visual das atualizações financeiras de OS e aplicados ajustes de `padding-bottom` (Liquid Glass / UX 2026) em todo o app.
- **[018-bugfixes-loading]** Bugfix da trava de recebíveis (D+1 idempotency update) e redesign moderno do componente `LoadingSpinner` implementados e arquivados.
- **[017-fechamento-caixa]** Fechamento de Caixa Físico implementado e arquivado. O sistema agora separa transações em "Dinheiro" do extrato bancário, criando registros de "Caixa Físico" que aguardam contagem manual e cálculo de divergência.
- **[016-store-dashboard-cleanup]** Melhorias no dashboard da Loja implementadas e arquivadas. Adicionada exibição de transações sem OS, melhoria nas badges de método de pagamento no extrato e limpeza visual da UI.
- **[015-juros-progressivos]** Refatoração da lógica de juros implementada e arquivada. O motor de extração de taxa da máquina de cartão agora é uma função utilitária global.
