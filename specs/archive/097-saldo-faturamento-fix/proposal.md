# Proposal: Nomenclatura de Faturamento vs Saldo e Inversão da Diferença (097)

## Problema
1. **Redundância e Erro de Nomenclatura:** Na tela de conciliação (Fechamento por Loja), o sistema exibe dois cards redundantes e confusos: "Saldo" e "Faturamento". O "Saldo" exibido não é o saldo da conta bancária da loja, mas sim a *Soma de Entradas do OFX (Faturamento Real)*. Por sua vez, o card "Faturamento" (que antes era uma soma de maquininha e pix) foi alterado recentemente para puxar também o saldo OFX, fazendo com que "Saldo" e "Faturamento" mostrem exatamente o mesmo valor (ex: R$ 14.529,13 e R$ 14.529,13).
2. **Matemática da Diferença Invertida:** O card de Diferença está efetuando a conta: `(Maquininha + PIX) - Faturamento`. Ou seja, `(Previsto) - (Real)`. Se a loja previa R$ 6.000 em planilha e entrou R$ 14.000 reais no banco, a conta fica `6000 - 14000 = -8000`. Isso faz a sobra de caixa (dinheiro real sobrando no banco não identificado) aparecer como "negativa" e vermelha, o que é um erro de contabilidade. 

## Solução Proposta
1. **Eliminar a Redundância Visual e Renomear:** 
   - Renomear o primeiro card de "Saldo" para **"Faturamento Banco"** (pois representa o dinheiro real que entrou na conta no dia).
   - Alterar o card antigo de "Faturamento" para se chamar **"Previsto Planilhas"** (representando a soma bruta da Maquininha + PIX, que é o que a loja esperava faturar).
2. **Inverter a Equação da Diferença:**
   - A fórmula passará a ser: `Diferença = Faturamento Banco - Previsto Planilhas`.
   - Dessa forma, se entrou *mais* dinheiro no banco do que a loja reportou na planilha, a diferença será positiva (sobra de caixa, cor verde). Se entrou *menos* (furo de caixa), a diferença será negativa (falta de dinheiro, cor vermelha).

## Contratos de Dados
Nenhuma tabela de banco de dados será alterada. É uma mudança estritamente de lógica de UI e reordenação de variáveis em `conciliacao.index.tsx`.

## Risco Principal
Os gerentes podem se assustar com a inversão da cor (o que antes era verde agora pode ficar vermelho caso a conta estivesse invertida), mas o alinhamento ficará logicamente inquestionável: dinheiro faltando no banco = negativo. Dinheiro sobrando no banco sem explicação = positivo.
