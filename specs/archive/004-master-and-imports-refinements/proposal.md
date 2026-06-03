# Proposal: Refinamentos Master & Inteligência de Imports

## Requisitos do Sistema
1. **Refatoração do Parser de Despesas:** Identificar corretamente a categoria da despesa na planilha, abandonando o hardcode "contas_pagar".
2. **Identificação Profunda de Loja nas OSs:** Fazer o parser de OS extrair o nome da loja de dentro da planilha (no conteúdo do Excel) para o Step de Mapeamento, ignorando o prefixo do arquivo (ex: `1675_`).
3. **Página Exclusiva Master:** A Loja "Global/Master" precisa de uma view especial no dashboard de lojas (`/loja/$lojaId`) focada apenas na parte financeira, removendo métricas inúteis para ela (como Carros no Pátio ou Extrato de OS).
4. **Simplificação da Conciliação Diária:** A rota `/conciliacao` deve focar apenas no Consolidado (Resultado) e na Detecção de Divergências, sem o feed listando todas as lojas e faturamentos individualmente.

## User Stories
- **US1:** Como gerente financeiro, quero que minhas despesas importadas mostrem categorias reais no gráfico (ex: "Aluguel", "Peças", "Imposto") para saber de onde meu dinheiro está vazando.
- **US2:** Como operador do sistema, ao arrastar as 10 planilhas do sistema antigo (cujos nomes são códigos incompreensíveis), quero que o Uploader inteligente me mostre o nome legível da loja (ex: "Loja Santo André") lido de dentro do arquivo para facilitar o mapeamento.
- **US3:** Como CEO, ao acessar o dashboard da holding (Master), quero ver apenas fluxo de caixa, saldos e despesas gerais, sem ver KPIs irrelevantes de oficina como "OSs Fechadas".
- **US4:** Como controladoria, ao entrar na Conciliação Diária, quero focar exclusivamente no "Global" do dia e em quais lojas precisam da minha atenção para corrigir divergências, sem me distrair com lojas que já estão 100% corretas.

## BDD Scenarios

### Cenário: Gráfico de despesas exibindo categorias reais
- **Given (Dado):** que importo uma planilha de Contas a Pagar onde a coluna "Categoria" ou "Descrição" tem o valor "Compra de Peças".
- **When (Quando):** eu visualizo o Gráfico de Saídas na página da loja.
- **Then (Então):** o sistema deve agrupar e exibir essa despesa sob a legenda "Compra de Peças", e não mais como "contas_pagar".

### Cenário: Leitura inteligente da loja no arquivo de OS
- **Given (Dado):** que importo um arquivo chamado `1675_ConferenciaOSxFinanceiro.xls`
- **When (Quando):** chego no passo 2 "Mapeamento de Lojas" do Wizard.
- **Then (Então):** o sistema deve listar "Loja X" (extraído da linha X do excel) como a entidade não mapeada em vez de listar o nome "1675_ConferenciaOSxFinanceiro.xls".

### Cenário: Visualização do Dashboard Master
- **Given (Dado):** que eu clico na filial que é marcada como `is_matriz = true` (Centro de Custos).
- **When (Quando):** a página `/loja/$lojaId` carrega.
- **Then (Então):** a página exibe componentes Analíticos Gerais (Entradas/Saídas) e o Extrato Bancário, ocultando totalmente as métricas "Carros no Pátio" e sem menção a Ordem de Serviço na tabela de transações.

### Cenário: Resumo na Conciliação Diária
- **Given (Dado):** que acesso a página `/conciliacao`.
- **When (Quando):** o layout renderiza os dados do dia.
- **Then (Então):** o grid massivo de 10 lojas não deve aparecer na tela principal. Em vez disso, vejo um grande Card de Saldo Consolidado, Tendência, e apenas alertas de quem tem divergência.
