# Proposal: CorreçÁo do Vazamento de Datas no Saldo OFX e Redesign dos Mini-Cards de Fechamento por Loja (fix-conciliacao-date-bleeding-and-mini-cards-ui)

## Problema
1. **Vazamento de Datas no Faturamento Itaú (OFX):**
   - Ao selecionar uma data no calendário da tela `/conciliacao` sem qualquer movimentaçÁo ou conciliaçÁo (Faturamento R$ 0,00, Maquininha R$ 0,00, PIX R$ 0,00, Na Loja OS R$ 0,00, Diferença R$ 0,00), a coluna `FATURAMENTO ITAÚ (OFX)` continuava exibindo os saldos acumulados de outro dia (ex: R$ 19.853,46, R$ 59.322,79, R$ 21.880,23).
   - **Causa Raiz:** O componente `conciliacao.index.tsx` utilizava `latestBankBalance[store.id]`, que busca o último saldo do banco independente da data selecionada. Em dias sem extrato ou conciliaçÁo, esse valor vazava do histórico.
2. **Layout Espremido e Texto Colidindo nos Mini-Cards:**
   - As 6 colunas de métricas no card de "Fechamento por Loja" estavam comprimidas dentro de um contêiner flex rígido.
   - Os títulos das colunas (`FATURAMENTO`, `MAQUININHA`, `PIX`, `NA LOJA OS`, `FATURAMENTO ITAÚ (OFX)`, `DIFERENÇA`) ficavam espremidos, gerando colisÁo de texto e quebras visuais desconfortáveis (`FATURAMENTOMAQUININHA PIX`).

## SoluçÁo Proposta

1. **EliminaçÁo Estrita do Vazamento de Datas no Saldo OFX (`src/routes/conciliacao.index.tsx`):**
   - Calcular `saldoItau` estritamente a partir das transações bancárias e saldos gravados para a `selectedDate` (`storeMod1?.saldo_banco_itau || bankBalances?.[store.id]?.in || 0`).
   - Se na data selecionada nÁo houver extrato OFX importado ou se nÁo houver conciliaçÁo para o dia, a coluna `FATURAMENTO ITAÚ (OFX)` deve exibir rigorosamente `R$ 0,00`.
2. **Redesign Executivo dos Mini-Cards de Fechamento por Loja (`src/routes/conciliacao.index.tsx`):**
   - Reformular a grade dos 6 indicadores por loja utilizando blocos individuais estilizados (`bg-black/40 border border-white/10 p-3 rounded-lg flex flex-col justify-between gap-1`).
   - Definir responsividade fluida (`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3`) com `min-w-0` e `truncate` nos títulos, garantindo que os rótulos nunca colidam ou encostem uns nos outros em nenhuma resoluçÁo de tela.

## Contratos de Dados
- Nenhuma alteraçÁo no schema do Supabase. Apenas refinamento da filtragem por data e layout React.

## Features Existentes Impactadas
- `src/routes/conciliacao.index.tsx`: ExibiçÁo do Fechamento por Loja e cálculo dos saldos OFX por data.
- `src/components/conciliacao/ResumoDiaPanel.tsx`: Garantia de consistência nos totais globais da página.

## Risco Principal
Exibir R$ 0,00 para o saldo Itaú em dias onde o operador importou o OFX.
*MitigaçÁo:* Se houver extrato importado na `selectedDate`, o valor real do extrato daquela data é exibido normalmente. Apenas em dias sem extrato/conciliaçÁo o valor será 0,00, eliminando o vazamento histórico.
