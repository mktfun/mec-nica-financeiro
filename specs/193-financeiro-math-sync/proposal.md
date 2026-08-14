# Proposal 193 - Simulador de Preços (Visão 360)

## O Problema Atual
Você deixou muito claro o que quer: a visão atual está misturando os conceitos e faltando campos. Você quer poder **simular o preço** em CADA plataforma individualmente (Mesa, iFood, 99, Keeta) e ver quanto de margem real aquilo vai dar, comparando isso com a "Meta" (o preço que o sistema calculou que você *deveria* vender para bater a margem da loja). 

## A Solução (Simulador 360º)
Vamos transformar a tabela em uma verdadeira ferramenta de simulação:
1. **A Base de Custos**: Fica limpa. Custo Variável (CMV + Embal). O C. Fixo (Rateio) continua lá apenas como informação, mas sem inflar o Custo Base para não distorcer a visão.
2. **Preço Meta (Sugerido)**: Apenas números informativos: "Para bater a meta da loja, venda a X na Mesa, Y no iFood, Z no 99".
3. **Simulador de Preço (O que quero praticar)**: Uma seção com 4 Inputs individuais (Mesa, iFood, 99, Keeta). 
4. **Margem Real Alcançada**: Do lado (ou embaixo) de cada input, mostramos o `% Mg Real` que aquela simulação gerou. 

Isso vai economizar muito espaço mental, pois para cada plataforma você vê:
`[ INPUT PREÇO ] -> RESULTADO: 15% Lucro`
