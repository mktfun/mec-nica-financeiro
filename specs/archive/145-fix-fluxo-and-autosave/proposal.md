# Proposal: Correção de Diferença e Auto-Save da Conciliação (Spec 145)

## Contexto e Entendimento (Revisado)
O usuário descartou a Spec 144 com razão, pois a definição de Fluxo de Caixa no sistema **DEVE** permanecer `Caixa Atual - Caixa Anterior`.
O problema original da Spec 143 permanece verdadeiro: a equação matemática que liga Fluxo de Caixa, Faturamento e Valor de Contas estava errada no código antigo (`Faturamento + Fluxo = Disponível`). O correto é `Faturamento - Fluxo = Disponível`. Isso corrige o cálculo da Diferença Final.

Em adição a isso, surgiram duas demandas gigantescas:
1. **Dúvida nas Despesas (700 vs 30k)**: O usuário importou de 04 a 07, mas as despesas mostravam apenas 739,55. Isso acontece porque o Dashboard filtra `target_date = Hoje`. O OFX *não soma tudo de todos os dias*, ele pega apenas os lançamentos de saída marcados com a data do dia selecionado no calendário do Dashboard. Precisamos deixar mais claro na UI o que compõe o "Valor Contas" (OFX + Juros) para evitar desconfiança.
2. **Auto-Save Histórico**: O usuário importou os dias anteriores, mas o `Caixa Anterior` não estava funcionando no dia 07 porque ele não havia clicado em "Gravar Fechamento Diário" nos dias anteriores. O usuário ordenou: "eu quero td automático".

## Solução Proposta
1. **Aplicar a Matemática da Spec 143**: `valor_disp_contas = Faturamento - Fluxo de Caixa`.
2. **Auto-Save na Importação**: O `CentralImportWizard.tsx` deve automaticamente chamar a RPC `get_dashboard_metrics` e disparar um `upsert` em `daily_snapshots` logo após concluir o upload de um dia. Assim, o Histórico fica gravado automaticamente, e se o usuário precisar editar, ele usa o painel depois.
3. **Detalhes do OFX no Dashboard**: Dividir visualmente (ou adicionar legenda clara) que "DESPESAS / JUROS" engloba: (a) Despesas OFX do dia, (b) Taxas da Maquininha do dia.
