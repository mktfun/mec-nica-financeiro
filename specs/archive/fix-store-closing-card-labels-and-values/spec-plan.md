# Spec Plan: Ajuste de Rótulos e Mapeamento do Card de Fechamento por Loja (fix-store-closing-card-labels-and-values)

## Tasks

- [x] [FRONTEND] Atualizar `src/routes/conciliacao.index.tsx`:
  - [x] Renomear o 1º mini-card para `Saldo` exibindo `saldoItau`
  - [x] Renomear o 5º mini-card para `Faturamento` exibindo `faturamento`
  - [x] Manter `Maquininha` (2º), `PIX` (3º), `Na Loja OS` (4º) e `Diferença` (6º) na ordem correta
- [x] [TEST] Verificar no frontend se a loja Dom Pedro exibe Saldo, Maquininha, PIX, Na Loja OS, Faturamento e Diferença corretamente
- [x] [TEST] Verificar build limpo com `npm run build`

