# Spec Plan: Correção do Vazamento de Datas no Saldo OFX e Redesign dos Mini-Cards de Fechamento por Loja (fix-conciliacao-date-bleeding-and-mini-cards-ui)

## Tasks

- [x] [FRONTEND] Refatorar `src/routes/conciliacao.index.tsx`:
  - [x] Garantir que o valor de `saldoItau` para cada loja utilize estritamente os lançamentos da `selectedDate` (`storeMod1?.saldo_banco_itau || bankBalances?.[store.id]?.in || 0`), zerando em dias sem conciliação
  - [x] Redesenhar os mini-cards de Fechamento por Loja com caixas individuais (`bg-white/5`), títulos truncated e espaçamento responsivo (`grid-cols-2 md:grid-cols-3 xl:grid-cols-6`)
- [x] [TEST] Verificar no calendário um dia sem conciliação e confirmar que Faturamento Itaú OFX exibe R$ 0,00 em todas as lojas
- [x] [TEST] Verificar a legibilidade visual dos 6 mini-cards por loja em diferentes resoluções de tela
- [x] [TEST] Verificar build limpo com `npm run build`

