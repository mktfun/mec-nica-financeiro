# Tarefas: Ajustes Finais de UI (012)

- `[x]` Consertar Gráfico de Pizza (Formas de Pagamento)
  - `[x]` Editar `src/routes/loja.$lojaId.tsx`.
  - `[x]` Implementar um parser inteligente para ler a string `payment_method` (ex: `Credito: 100.00; PIX: 50.00`).
  - `[x]` Acumular os valores reais separados por tipo de pagamento em vez de usar a string bruta inteira.
- `[x]` Melhorar a Legibilidade do Último Fechamento
  - `[x]` Editar `src/routes/loja.$lojaId.tsx`.
  - `[x]` Adicionar textos descritivos sob "Apurado Sistema" e "Liquidado Conta" para clarificar a origem (Soma de OS vs Transações Bancárias).
- `[x]` Limpar Ranking e Ajustar Tooltips
  - `[x]` Editar `src/components/dashboard/StoreRankingChart.tsx`.
  - `[x]` Remover os botões de "Faturamento / Volume (OSs)".
  - `[x]` Remover o campo `mockOs` do processamento.
  - `[x]` Ajustar cores `itemStyle` do Tooltip do Recharts.
