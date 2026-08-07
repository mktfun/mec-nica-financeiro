# Spec Plan: ReestruturaçÁo dos Cards de Fechamento por Loja e Resumo Diário Consolidado (redesign-conciliacao-cards-and-daily-summary)

## Tasks

- [ ] [FRONTEND] Atualizar `src/hooks/useTransactions.ts`:
  - [ ] Criar hook `useLatestBankBalance()` que busca o último `bank_total` importado por loja (sem restriçÁo de data) para evitar saldo zerado em dias sem OFX.
  
- [ ] [FRONTEND] Atualizar `src/hooks/useConciliacao.ts` (`useModulo1StoresData`):
  - [ ] Adicionar cálculo de `pix_os` = somatório de `pix_transfer_value` das OSs do Pátio de cada loja no dia.
  - [ ] Corrigir `na_loja_os` para ser a soma do saldo em aberto real (`total_value - paid_value`) das OSs ativas da loja.

- [ ] [FRONTEND] Reformular Cards de Loja em `src/routes/conciliacao.index.tsx`:
  - [ ] **Remover** colunas "Dinheiro MP" e "A Receber".
  - [ ] **Adicionar** 6 colunas: Faturamento, Maquininha, PIX, Na Loja OS, Banco Itaú (Saldo), Diferença.
  - [ ] Diferença = `faturamento - (maquininha + pix)`.
  - [ ] Usar `useLatestBankBalance()` no lugar de `bankBalances[id].rawBalance` para o Saldo Itaú.

- [ ] [FRONTEND] Reformular painel consolidado `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - [ ] Substituir ou complementar os totalizadores globais com: Faturamento, Maquininha, PIX, Juros, Saldo Total Itaú (acumulado), Diferença.
  - [ ] O "Saldo Total Itaú" deve usar a soma dos últimos saldos OFX reais de todas as lojas.

- [ ] [TEST] Verificar build limpo com `npm run build`.
