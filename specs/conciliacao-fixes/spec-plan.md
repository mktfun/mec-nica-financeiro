# Spec Plan: Correção de Match Aba 2 (REDE vs OFX) e Faturamento de OS na Aba 1 (conciliacao-fixes)

## Tasks

- [x] [FRONTEND] Atualizar `src/hooks/useConciliacao.ts` em `useReconciliationViews`:
  - [x] Normalizar a busca de `patio_os` usando conversão para string e remoção de prefixo para resolver o faturamento `-` na Aba 1.
  - [x] Implementar segregação de lançamentos de adquirente (Rede) vs lançamentos gerais no OFX na Aba 2.
  - [x] Adicionar cálculo de match do líquido total da maquininha contra os depósitos de adquirente.
- [x] [FRONTEND] Atualizar `src/components/conciliacao/RedeVsOfxTable.tsx`:
  - [x] Ajustar o card de resumo para comparar o Líquido da Maquininha apenas contra os créditos de adquirente pareados.
  - [x] Adicionar tabela/seção secundária para "Outros Lançamentos no Banco (PIX/Transferências)".
- [x] [FRONTEND] Atualizar `src/components/conciliacao/OsVsRedeTable.tsx`:
  - [x] Garantir formatação em R$ do faturamento da OS e do Delta sem exibir `-` incorreto quando houver OS pareada.
- [x] [TEST] Executar `npm run build` para validar compilação limpa sem erros.
