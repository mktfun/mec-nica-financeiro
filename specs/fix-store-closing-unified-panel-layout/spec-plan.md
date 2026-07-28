# Spec Plan: Restauração do Painel Unificado de Fechamento por Loja com Espaçamento Amplo (fix-store-closing-unified-panel-layout)

## Tasks

- [ ] [FRONTEND] Refatorar `src/routes/conciliacao.index.tsx`:
  - [ ] Remover as pílulas/caixas isoladas de cada um dos 6 mini-cards
  - [ ] Envelopar os 6 indicadores em um único painel contínuo (`bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1`)
  - [ ] Aplicar espaçamento interno amplo (`gap-6 xl:gap-8`) com separação sutil para a coluna `Diferença`
- [ ] [TEST] Verificar visualmente se o fundo contínuo do painel foi restaurado e se o espaçamento está amplo e elegante
- [ ] [TEST] Verificar build limpo com `npm run build`
