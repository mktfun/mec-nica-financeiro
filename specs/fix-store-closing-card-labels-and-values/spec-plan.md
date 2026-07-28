# Spec Plan: Ajuste de Rótulos e Mapeamento do Card de Fechamento por Loja (fix-store-closing-card-labels-and-values)

## Tasks

- [ ] [FRONTEND] Atualizar `src/routes/conciliacao.index.tsx`:
  - [ ] Renomear o 1º mini-card para `Saldo` exibindo `saldoItau`
  - [ ] Renomear o 5º mini-card para `Faturamento` exibindo `faturamento`
  - [ ] Manter `Maquininha` (2º), `PIX` (3º), `Na Loja OS` (4º) e `Diferença` (6º) na ordem correta
- [ ] [TEST] Verificar no frontend se a loja Dom Pedro exibe Saldo, Maquininha, PIX, Na Loja OS, Faturamento e Diferença corretamente
- [ ] [TEST] Verificar build limpo com `npm run build`
