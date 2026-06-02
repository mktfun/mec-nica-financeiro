# Proposal: Fechamento de Caixa Físico (017)

## Contexto e Problema
Atualmente, quando uma planilha é importada, o sistema assume automaticamente que todo o pagamento em "Dinheiro" já está consolidado no caixa e joga esse valor direto para o Extrato Bancário.
No mundo real, o gerente precisa contar as notas e moedas (Caixa Físico) no fim do expediente. O sistema não deve deduzir que o caixa está correto sem antes pedir a "prestação de contas" em dinheiro físico.
Se a OS diz que entrou R$ 200 em dinheiro, o sistema deve registrar isso como "Valor Esperado" e ficar pendente até o gestor contar as notas e declarar "Eu tenho R$ 190 aqui em mãos". Só então a divergência (-R$ 10) deve ser registrada.

## Requisitos e User Stories
- **Eu como gestor**, não quero que os pagamentos em "Dinheiro" nas OSs entrem no meu extrato bancário automaticamente, pois dinheiro físico ainda não está no banco.
- **Eu como gestor**, quero uma tela onde o sistema me diz: "Hoje você teve OSs pagas em dinheiro, por favor declare quanto você tem em espécie no caixa".
- **Eu como gestor**, quero poder digitar o valor real que tenho nas mãos, para que o sistema compare com o valor esperado pelas OSs e só então me mostre se sobrou ou faltou dinheiro (Divergência de Caixa Físico).

## O que já existe e será reutilizado
- A função de importação já agrupa e calcula o total de "Dinheiro" de cada dia (`summary.totalDinheiro`).

## O que precisa ser criado/alterado
1. **Backend (Supabase):**
   - Criar uma nova tabela `cash_registers` (Caixas Físicos) com: `store_id`, `date`, `expected_amount` (o que as OSs dizem), `declared_amount` (o que o usuário contou), `divergence`, e `status` (pending/closed).
2. **Importador (`useImportProcessor.ts`):**
   - Modificar a regra para NÃO lançar os pagamentos em "Dinheiro" diretamente na tabela `transactions`. Em vez disso, jogar o total esperado em dinheiro (PIX, Cartões e Depósitos vão pro extrato, Dinheiro vai pro `cash_registers` como Pendente).
3. **Frontend (UI):**
   - Na página da Loja (`/loja/$lojaId`), criar uma nova aba ou seção "Caixa Físico".
   - Listar os dias que estão com caixa "Pendente".
   - Formulário simples com um input: "Valor contado na gaveta" -> Botão "Fechar Caixa Diário".

## Critérios de Aceite
1. Importar uma planilha com pagamentos em dinheiro não polui mais o "Extrato Bancário" com valores que ainda não foram depositados.
2. O usuário consegue declarar o valor físico e ver imediatamente se houve quebra de caixa.
