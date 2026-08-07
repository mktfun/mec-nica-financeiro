# Proposal: Dashboard de Conciliação "Revolut Style"

## Visão Geral
Refatorar a página de conciliação para adotar a estética e UX premium do app Revolut. Focaremos em exibir de imediato uma **Visão Macro Poderosa** (o que importa para a diretoria) com um gráfico integrado ao número hero, além de tornar as 10 lojas numa lista limpa e acionável.

## Estrutura da Página

### 1. Seção "Hero" (Visão Consolidada & Gráfico)
Em vez de 4 cartões pequenos no topo, teremos **um grande cartão Hero** com fundo escuro brilhante ou translúcido contendo:
- **Título Sutil**: "Faturado na Rede (Hoje)"
- **Valor Gigante (Hero Typography)**: `R$ 42.500,00` em fonte proeminente.
- **Botões Pill-shape**: Abaixo do saldo, botões pílula para atalhos rápidos (ex: "Ver Pátio Geral").
- **Seamless Line Chart**: O fundo inferior desse cartão será um gráfico de linha minimalista sem bordas ou números de eixo. Ele mostrará a tendência de faturamento dos últimos dias, dando aos sócios um visual claro de "estamos subindo ou caindo".

### 2. Seção "Lista de Unidades"
Embaixo do Hero, a lista das lojas em formato de feed (vertical):
- **O Design**: Cada loja é uma linha (List Item) gordinha e com padding generoso.
- **O Layout da Linha**: 
  - Esquerda: Ícone circular colorido (Verde se OK, Vermelho se divergir, Cinza se pendente).
  - Meio: Nome da loja em negrito. Embaixo, texto menor cinza "Última atualização às 15:30".
  - Direita: Valor faturado alinhado à direita (`R$ 4.500,00`). E se a loja exigir ação de gaveta, um ponto neon pulsante.
- Esse modelo elimina a poluição visual do grid e adota o padrão exato de "contas" do Revolut.

### 3. Drawer (Slide-over) de Detalhes da Loja
Ao clicar numa unidade da lista, a gaveta (Slide-over vindo da direita, implementado na spec passada, mas agora com o design Revolut) sobe.
- O Drawer terá um "Hero" menor com o saldo específico da loja, pintado de "Neon Yellow/Green" (`#CCFF00`) ou "Dark" para contraste absurdo.
- Logo abaixo, a lista de transações da loja (mesmo design da lista de fora) e o formulário "Smart Cash" em formato de pílulas flutuantes no rodapé (Sticky Footer).

## BDD Scenarios

### Cenário: Visão Gerencial Premium (Revolut)
- **Given (Dado):** O diretor abre a página "Fechamento de Caixa".
- **When (Quando):** A página renderiza.
- **Then (Então):** Ele vê um valor gigante no centro superior com a soma faturada de todas as lojas hoje. Atrás desse número, uma onda fluida (gráfico) mostra a saúde financeira da semana. Abaixo, as 10 lojas listadas de forma limpa e classificada.

### Cenário: Fechando Caixa na UX Revolut
- **Given (Dado):** O usuário clica na loja "Rei do Módulo" que está com um indicador neon de "ação necessária".
- **When (Quando):** A gaveta lateral abre com o fundo translúcido (Liquid Glass).
- **Then (Então):** O usuário vê o extrato limpo. Na parte de baixo da gaveta, um input gigante e arredondado para digitar o físico, junto a um botão brilhante que confirma e fecha o caixa.
