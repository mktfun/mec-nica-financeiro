# Proposal: Ajuste de Rótulos e Mapeamento do Card de Fechamento por Loja (fix-store-closing-card-labels-and-values)

## Problema
- Na grade do card de "Fechamento por Loja" em `src/routes/conciliacao.index.tsx`, o primeiro mini-card estava rotulado como `Faturamento` e o quinto mini-card como `Faturamento Itaú (OFX)`.
- Isso gerava duplicidade de termos ("Faturamento" duas vezes) e invertia a leitura conceitual das métricas. O operador esperava ver o **Saldo Bancário** no primeiro card e a **Receita Bruta (Faturamento)** no quinto card.

## Solução Proposta

Reorganizar e renomear estritamente os 6 mini-cards de cada loja na rota `/conciliacao`:

1. **Card 1 — `Saldo`:** Exibe o saldo/entradas bancárias OFX do dia (`saldoItau`).
2. **Card 2 — `Maquininha`:** Exibe o valor total de vendas em cartão Rede (`maquininha`).
3. **Card 3 — `PIX`:** Exibe o valor de transferências PIX das OSs do dia (`pixOs`).
4. **Card 4 — `Na Loja OS`:** Exibe o valor total em aberto das OSs pendentes no Pátio (`naLojaOs`).
5. **Card 5 — `Faturamento`:** Exibe a receita/faturamento bruto total das OSs faturadas na loja no dia (`faturamento`).
6. **Card 6 — `Diferença`:** Exibe a diferença apurada entre o Faturamento e os recebimentos (`faturamento - (maquininha + pixOs)`).

## Contratos de Dados
- Nenhuma alteração no banco de dados Supabase. Apenas renomeação de rótulos e mapeamento correto dos valores em `src/routes/conciliacao.index.tsx`.

## Features Existentes Impactadas
- `src/routes/conciliacao.index.tsx`: Visualização e cálculo dos mini-cards da seção "Fechamento por Loja".

## Risco Principal
Confusão do usuário se a fórmula da diferença não refletir `Faturamento - (Maquininha + PIX)`.
*Mitigação:* A fórmula da diferença utiliza estritamente o faturamento bruto menos os meios de pagamento recebidos no dia.
