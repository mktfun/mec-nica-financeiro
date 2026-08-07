# Proposal: Correções de UI, Cores e Gráfico de Pagamentos (012)

## Contexto e Problema
1. **Confusão de Valores no Último Fechamento**: O card mostra "Apurado Sistema R$ 8.550" e "Liquidado Conta R$ 0,00". Isso causa estranheza porque os nomes técnicos não são óbvios e o zero parece um erro, quando na verdade significa que não houve entrada bancária conciliada para aquele dia/loja.
2. **Gráfico de Pizza Poluído**: A forma de pagamento salva no banco para uma OS muitas vezes é um texto composto (ex: `Credito: 10000.00; PIX: 200.00;`). O gráfico está agrupando essas strings inteiras como se fossem categorias únicas, gerando dezenas de fatias repetidas e ilegíveis.
3. **Cores do Tooltip**: No gráfico de Ranking das Lojas, o texto dentro do balão hover (tooltip) está escuro num fundo escuro, impossibilitando a leitura.
4. **Volume de OS Irreal**: O gráfico de Ranking tinha um mock (simulação) para calcular o número de OSs com base no faturamento, gerando números bizarros (ex: 297 OSs para uma loja).

## O Que Será Feito
1. **Clarificação do "Último Fechamento"**: Adicionar legendas explicativas (tooltips ou texto menor) esclarecendo que "Apurado Sistema" é a soma das OSs e "Liquidado Conta" é o que de fato compensou na conta bancária.
2. **Refatoração do Gráfico de Formas de Pagamento**: Criar uma função de extração que lê strings como `Credito: 10000.00; PIX: 200.00;` e separa corretamente os valores para somá-los na fatia certa do gráfico (ex: R$ 10.000 em Crédito e R$ 200 em PIX).
3. **Correção de Cores**: Ajustar `contentStyle` e propriedades de fonte do `Tooltip` do Recharts no Ranking e no Gráfico de Pizza.
4. **Remoção de Dados Fakes**: Ocultar/Remover o toggle de "Volume (OSs)" no Ranking, mantendo o ranking restrito ao Faturamento Real, para evitar qualquer número inventado.

## O Que Já Existe e Será Reutilizado
- `src/routes/loja.$lojaId.tsx`: Onde o gráfico de pizza está implementado.
- `src/components/dashboard/StoreRankingChart.tsx`: Onde os tooltips e o mock de OS estão.

## Critérios de Aceite
- O Gráfico de Pizza terá no máximo ~5 fatias (Crédito, Débito, PIX, Dinheiro, etc).
- Os tooltips terão texto perfeitamente legível (branco no fundo escuro).
- O número astronômico de OSs sumirá.
