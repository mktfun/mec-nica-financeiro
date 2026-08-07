# Proposal: Importador Universal de Despesas (Contas a Pagar e Juros)

## Objetivo
Criar uma interface robusta para importação, processamento e mapeamento de dados oriundos das planilhas financeiras da empresa (`BuscaContasAPagar.xls`, `JUROS REDE.xlsx`, entre outras), inserindo despesas diretamente na tabela de `transactions` de cada loja.

## Requisitos de Negócio (Business Requirements)
1. O sistema deve permitir o upload de arquivos `.xls` e `.xlsx`.
2. O parser deve identificar e tratar as diferenças estruturais (Ex: `BuscaContasAPagar` é uma tabela limpa com a loja na coluna `Emp`, enquanto `JUROS REDE` é descentralizado com layouts dinâmicos).
3. O sistema deve possuir uma etapa de **Mapeamento de De/Para**: relacionando o nome da loja extraído do arquivo (ex: `MPpiraporinha`) com o ID oficial da loja no banco de dados.
4. O sistema deve persistir as escolhas de mapeamento do usuário (ex: em `localStorage` ou tabela de configurações) para não perguntar novamente em futuras importações.
5. As despesas importadas entram como saídas (tipo `out`) nas transações da loja.
6. A **Loja Master** deve suportar alocação de custos e contas a pagar normalmente, mesmo sem receitas atreladas a ela.
7. Ao final, a interface deve exibir um Dashboard visual resumindo as saídas cadastradas e seus impactos nos saldos, consolidado por unidade.

## User Stories
- **US1:** Como gerente financeiro, quero arrastar uma planilha de "Busca de Contas a Pagar" para o sistema para que ele extraia todos os pagamentos realizados.
- **US2:** Como gerente financeiro, quero que o sistema pergunte "Qual loja é 'MPpiraporinha'?" e lembre da minha resposta na próxima vez.
- **US3:** Como analista, quero revisar o resumo do que será salvo antes de confirmar a importação, evitando erros em lote no banco de dados.
- **US4:** Como gestor, quero poder ver o saldo consolidado de saídas das lojas (incluindo a Master) no fluxo de caixa geral.

## Critérios de Aceite
- Suporte aos formatos legados `.xls` e novos `.xlsx`.
- Tratamento de erro elegante se o usuário tentar subir um arquivo que não corresponda a nenhum layout reconhecido.
- Step visual e intuitivo de mapeamento de lojas.
- Inserção em lote (Bulk Insert) otimizada via Supabase SDK.

## BDD Scenarios

### Cenário: Mapeamento de loja desconhecida
- **Given (Dado):** O usuário enviou o arquivo `BuscaContasAPagar.xls` contendo o lançamento da loja `MPrudge`. O sistema nunca viu essa sigla antes.
- **When (Quando):** O processamento da leitura terminar.
- **Then (Então):** O sistema pausa na etapa 2 (Mapeamento) e exibe um alerta pedindo para o usuário associar `MPrudge` a uma loja ativa no banco de dados, bloqueando a importação até a escolha ser feita.

### Cenário: Reconhecimento inteligente de loja salva
- **Given (Dado):** O usuário já vinculou `MPMaster` à loja "Matriz" anteriormente.
- **When (Quando):** O usuário importa o relatório de `JUROS REDE.xlsx` contendo custos para a `MPMaster`.
- **Then (Então):** O sistema pula a fase de mapeamento manual para a `MPMaster` e já totaliza as despesas atreladas à loja "Matriz" na tela de revisão final.

### Cenário: Loja Master apenas com Custos
- **Given (Dado):** O usuário entra na tela da Loja Master no dashboard após as importações do dia.
- **When (Quando):** Ele avalia a saúde financeira.
- **Then (Então):** A tela apresenta zero faturamento de OS, mas mostra adequadamente todos os débitos importados de Contas a Pagar e o balanço líquido ficará devidamente negativo (representando que ela é um centro de custo).
