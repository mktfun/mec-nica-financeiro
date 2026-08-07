# Proposal: Dashboard Gerencial de Lojas (014)

## Contexto e Problema
O usuário compartilhou uma planilha manual que a diretoria (Daniel) utilizava para controle, que contém métricas avançadas além do "Entrou/Saiu". Eles querem que a visão do sistema seja capaz de mostrar as mesmas informações, mas com a vantagem de ser sistêmico e mais detalhado.
As informações-chave visualizadas no modelo antigo são:
- **Saldos Bancários:** Saldo no Banco (ex: Banco Itaú) e Limite da conta.
- **Métricas de Caixa (Fluxo e Faturamento):** Faturamento Atual, Valor do Fluxo de Caixa, Valor Disponível para Contas, Valor das Contas.
- O detalhamento do que "Entrou" ou "Não Entrou", separado pelas formas de pagamento (Dinheiro, Cartão Crédito/Débito).

## Requisitos e User Stories
- **Eu como gestor financeiro (Daniel)**, quero acessar a página da loja (`/loja/$id`) e ter um "Resumo Gerencial" no topo.
- **Eu como gestor financeiro**, quero bater o olho e ver qual o Saldo atual e o Limite do banco daquela loja.
- **Eu como gestor financeiro**, quero ver o consolidado de Faturamento e Fluxo de Caixa no mesmo lugar.

## O que já existe e será reutilizado
- A página `src/routes/loja.$lojaId.tsx` já existe e possui um layout limpo com AppShell, mas o espaço no topo atualmente mostra apenas "Último Fechamento" (Apurado vs Liquidado).
- Os hooks de dados da loja já trazem as movimentações de onde podemos deduzir o faturamento e fluxo de caixa.

## O que precisa ser criado/alterado
- Na página `loja.$lojaId.tsx`, vamos reorganizar a hierarquia visual.
- Criar um grande "Painel de Bordo (Resumo Financeiro da Loja)" que agrupe:
  - Saldo Bancário (com badge Negativo/Positivo) e Limite.
  - Faturamento / Fluxo de Caixa / Valores a Pagar.
- Como esses dados de Saldo e Limite ainda não vêm da base de dados, adicionaremos os blocos de UI (visual) para já preparar a tela para receber essa integração no futuro ou para digitação manual, alinhando com a expectativa visual do usuário.

## Critérios de Aceite
1. O Painel da Loja deve incorporar a linguagem do Excel enviado (Saldo Banco, Limite, Faturamento, Valor das Contas).
2. O layout deve manter o padrão SDD (Design rico, micro-interações, ícones Lucide) de timeline/cards que já aplicamos antes.
