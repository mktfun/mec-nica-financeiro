# Phase 1: Research - Conciliação Tripla (OS x Maquininha x OFX)

## Contexto do Negócio
O usuário necessita aprofundar a conciliação diária. Em vez de apenas ver o saldo consolidado (Sistema vs Banco), ele precisa clicar na loja e fazer um **"Match" Triplo (Conciliação 3-way)**:
1. **Ponta 1 (A Origem):** O que foi registrado na Ordem de Serviço (OS) ontem. (Importado de Carros em Pátio)
2. **Ponta 2 (O Intermediário):** O que passou na maquininha de cartão hoje. (Importado de Recebíveis D+1)
3. **Ponta 3 (O Destino):** O que caiu na conta bancária (OFX).

## O Problema do "Juros" (Taxas da Máquina)
As OSs geralmente registram o valor "líquido/fechado" do serviço, porém, se o cliente parcela, a maquininha cobra do cliente com juros. Isso faz com que o valor que passa na maquininha (e cai no banco) seja **maior** do que o valor que estava anotado na OS. Se o sistema apenas bater valor exato, nunca vai cruzar corretamente.

## Solução Exigida
1. **Painel de Configurações de Taxas:** Uma interface onde o usuário define as taxas e regras de juros de cada tipo de operação (ex: 12x no Crédito = X% de juros).
2. **Algoritmo de Match Inteligente:** Na hora de listar e conciliar as transações na tela da Loja (Detalhes do Dia), o sistema pegará o valor da OS, aplicará a alíquota de juros (se a forma de pagamento for cartão parcelado) e procurará o valor exato correspondente na importação da Maquininha e no OFX.
3. **UI de Conciliação Granular:** Uma tela (`loja.$lojaId.tsx` ou similar, filtrada por dia) que liste as transações lado a lado mostrando visualmente se o "Match" foi perfeito (OS = Maquininha = Banco).
