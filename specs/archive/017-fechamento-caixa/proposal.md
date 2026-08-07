# Proposal: Fechamento de Caixa Físico (017)

## Contexto e Problema
Atualmente, quando uma planilha é importada, o sistema assume automaticamente que todo o pagamento em "Dinheiro" já está consolidado no caixa e joga esse valor direto para o Extrato Bancário.
No mundo real, o gerente precisa contar as notas e moedas (Caixa Físico) no fim do expediente. O sistema nÁo deve deduzir que o caixa está correto sem antes pedir a "prestaçÁo de contas" em dinheiro físico.
Se a OS diz que entrou R$ 200 em dinheiro, o sistema deve registrar isso como "Valor Esperado" e ficar pendente até o gestor contar as notas e declarar "Eu tenho R$ 190 aqui em mÁos". Só entÁo a divergência (-R$ 10) deve ser registrada.

## Requisitos e User Stories
- **Eu como gestor**, nÁo quero que os pagamentos em "Dinheiro" nas OSs entrem no meu extrato bancário automaticamente, pois dinheiro físico ainda nÁo está no banco.
- **Eu como gestor**, quero uma tela onde o sistema me diz: "Hoje você teve OSs pagas em dinheiro, por favor declare quanto você tem em espécie no caixa".
- **Eu como gestor**, quero poder digitar o valor real que tenho nas mÁos, para que o sistema compare com o valor esperado pelas OSs e só entÁo me mostre se sobrou ou faltou dinheiro (Divergência de Caixa Físico).

## O que já existe e será reutilizado
- A funçÁo de importaçÁo já agrupa e calcula o total de "Dinheiro" de cada dia (`summary.totalDinheiro`).

## O que precisa ser criado/alterado
1. **Backend (Supabase):**
   - Criar uma nova tabela `cash_registers` (Caixas Físicos) com: `store_id`, `date`, `expected_amount` (o que as OSs dizem), `declared_amount` (o que o usuário contou), `divergence`, e `status` (pending/closed).
2. **Importador (`useImportProcessor.ts`):**
   - Modificar a regra para NÁO lançar os pagamentos em "Dinheiro" diretamente na tabela `transactions`. Em vez disso, jogar o total esperado em dinheiro (PIX, Cartões e Depósitos vÁo pro extrato, Dinheiro vai pro `cash_registers` como Pendente).
3. **Frontend (UI):**
   - Na página da Loja (`/loja/$lojaId`), criar uma nova aba ou seçÁo "Caixa Físico".
   - Listar os dias que estÁo com caixa "Pendente".
   - Formulário simples com um input: "Valor contado na gaveta" -> BotÁo "Fechar Caixa Diário".

## Critérios de Aceite
1. Importar uma planilha com pagamentos em dinheiro nÁo polui mais o "Extrato Bancário" com valores que ainda nÁo foram depositados.
2. O usuário consegue declarar o valor físico e ver imediatamente se houve quebra de caixa.
