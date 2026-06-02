# Proposal: Dashboards Mensais, Rankings e Visualizações Avançadas (011)

## Contexto e Problema
Apesar das melhorias, a visão mensal introduziu alguns bugs de contagem e os gráficos/detalhamentos ainda podem ser melhores:
1. **Contagens Erradas**: O painel diz "17 lojas pendentes" mas há apenas 10 lojas cadastradas. Isso ocorre pois o backend está contando *linhas de fechamento* ao invés de *lojas únicas* no mês.
2. **Grid Zerado**: Os cards individuais das 10 lojas ainda estão filtrando o faturamento para o dia de "hoje" (resultando em R$ 0,00), divergindo do total do mês exibido acima.
3. **Falta de Gráficos na Loja**: A visão da loja está apenas com texto. O usuário quer ver gráficos como distribuição de formas de pagamento. Além de paginação no extrato e filtro de despesas.
4. **Ranking no Dashboard**: O usuário deseja ver no dashboard principal um gráfico de ranking (quem faturou mais, quem tem mais OSs, etc) e quer uma repaginada na seção "Atividade Recente".

## O Que Já Existe e Será Reutilizado
- `src/hooks/useConciliacao.ts` -> Hooks atuais (`useConciliacaoResumo`, `useConciliacaoDetalhes`).
- `src/components/dashboard/RecentActivity.tsx` -> Atividade recente.
- `src/routes/loja.$lojaId.tsx` -> Tela de dashboard dedicada da loja.
- `Recharts` já está instalado e disponível para os gráficos.

## O Que Será Feito
1. **Correção de Contagem e Grid**: 
   - Refatorar `useConciliacaoResumo` para agrupar os fechamentos por loja antes de calcular se a "Loja está conciliada".
   - Refatorar `useConciliacaoDetalhes` para também puxar os dados do mês inteiro e retornar um consolidado por loja (soma faturamento de todos os dias daquela loja).
2. **Gráficos na Tela da Loja**: 
   - Adicionar um gráfico de "Formas de Pagamento" (Pizza/Donut) no canto esquerdo da página da loja.
   - Adicionar abas/filtros (Tudo, Entradas, Saídas/Despesas) e paginação na lista do extrato bancário.
3. **Novo Componente de Ranking no Dashboard**: 
   - Criar `StoreRankingChart.tsx` que permite alternar a visualização entre "Maior Faturamento" e "Mais OSs".
   - Melhorar o design do `RecentActivity.tsx`.

## Critérios de Aceite
- Lojas Conciliadas mostrará X / 10.
- Grid de Lojas mostrará os mesmos valores do "Total do Mês".
- Dashboard da Loja terá o gráfico de donut de pagamentos.
- Dashboard Principal terá o novo gráfico de barras de ranking de lojas.
