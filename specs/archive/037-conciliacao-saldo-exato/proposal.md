# Spec 037 - Saldo Diário de Conciliação e Ajuste de Rotas

## Requisitos
1. **Saldo Correto na Conciliação Diária:** Na página de Conciliação, o valor "Sistema (Cartão+Din)" de cada loja está aparecendo `0,00` porque ele está consumindo a coluna legada de `financial_total` da tabela `reconciliations`. O valor exigido pelo cliente é a soma em tempo real das Entradas menos Saídas do sistema para a referida loja na data selecionada (ou seja, exatamente o que foi inserido via despesas/juros/etc. no dia com source != 'ofx').
2. **Correção de Fluxo de UI (Telas Lojas x Conciliação):** 
   - Na tela interna da Loja (`/loja/$lojaId`), o botão de "voltar" está encaminhando para `/conciliacao`. Deve encaminhar para a tela master de `/lojas`.
   - Na tela de Conciliação, os blocos ("cards") das lojas devem ser "clicáveis", encaminhando o usuário para `/loja/$lojaId` (abrindo os detalhes com os cálculos reais do sistema).

## BDD Scenarios

### Cenário: Cálculo Real do Sistema na Conciliação
- **Given (Dado):** que o banco de dados possui transações (`source='system'`) na Loja "Jorge Bereta" totalizando +R$ 5.000,00 de entradas e -R$ 1.000,00 de saídas no dia X.
- **When (Quando):** o usuário visualizar a Conciliação Diária do dia X.
- **Then (Então):** o valor no campo "Sistema (Cartão+Din)" deve mostrar exatamente `R$ 4.000,00`.

### Cenário: Navegação Orgânica de Lojas
- **Given (Dado):** o usuário está na tela de Conciliação.
- **When (Quando):** ele clica no "Card" da loja Dom Pedro.
- **Then (Então):** ele é roteado para a URL `/loja/st-01`. Ao clicar em "Voltar" dentro dessa tela, ele é retornado para a vitrine geral de `/lojas`.
