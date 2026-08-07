# Spec 034: Diagnóstico Profundo e Motor de Match OFX

## 1. VisÁo Geral
Esta especificaçÁo aborda três correções críticas no fluxo de conciliaçÁo bancária: a falha de persistência na importaçÁo de Extratos/Maquininhas, o detalhamento das divergências financeiras, a proteçÁo contra falsos-positivos nos ajustes de saldo manuais da loja e a implementaçÁo de um **Motor de ReconciliaçÁo OFX 1:1**.

## 2. Requisitos

### 2.1 Backend / Persistência e Motor OFX
- O `WizardImportacao.tsx` deve invocar uma mutaçÁo robusta (`useBulkInsertTransactions`) para gravar o conteúdo parseado de OFX e Maquininha diretamente na tabela `transactions`, porém marcados com uma origem (`source='ofx'` ou marcados via `subtitle`).
- **Motor de Match 1:1:** O sistema deverá cruzar as transações do sistema (OS/Despesas) com os extratos bancários (OFX/Maquininha) importados para o mesmo dia e loja.
- Transações importadas do OFX que nÁo encontram um par correspondente no sistema (e vice-versa) devem gerar **Alertas** detalhados.

### 2.2 Frontend / UX
- **CorreçÁo do "Falso-Positivo":** A heurística que detecta `Entradas sem OS vinculada` no Dashboard da Loja deve ignorar proativamente qualquer registro com `subtitle === 'Ajuste de Saldo Inicial'`.
- **Rastreabilidade de Divergência:** Na tela Global de ConciliaçÁo, lojas divergentes (Apurado vs Extrato) devem prover um botÁo "Ver Detalhes" guiando o usuário para as abas detalhadas de extrato, esclarecendo a origem da divergência (seja uma falha no Físico ou OS nÁo batida).
- **Central de Alertas:** A tela `/alertas` (atualmente ociosa) será o hub central para exibir transações "Sobrando no Banco" ou "Faltando no Banco", baseadas no resultado do Motor de Match.

## 3. BDD Scenarios

### Cenário 1: ImportaçÁo de OFX com TransaçÁo Sobrando
- **Given (Dado):** que o sistema possui R$ 500 em OS finalizadas hoje.
- **When (Quando):** o usuário importa um OFX que acusa R$ 500 referentes à OS, mais uma TED nÁo identificada de R$ 385.
- **Then (EntÁo):** a conciliaçÁo do dia exibirá uma divergência de R$ 385.
- **And (E):** a tela de Alertas exibirá um alerta crítico "Entrada no Extrato sem registro no Sistema: R$ 385,00".

### Cenário 2: Filtragem do Ajuste de Saldo
- **Given (Dado):** que o usuário fez um "Ajuste de Saldo Inicial" inserindo uma transaçÁo `in` de R$ 60.000 para bater o caixa.
- **When (Quando):** o motor analisa anomalias.
- **Then (EntÁo):** o valor de R$ 60.000 nÁo deve ser rotulado como divergência ou gerar alertas, pois é um ajuste contábil intencional.
