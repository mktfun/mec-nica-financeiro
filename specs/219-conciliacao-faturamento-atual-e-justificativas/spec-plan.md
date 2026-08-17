# Spec Plan: Faturamento Atual com Justificativas, Abatimento de Diferença na Loja e Breakdown (219)

## Tasks

- [ ] [FRONTEND/HOOKS] Criar hook `src/hooks/useJustifiedTransactions.ts` para buscar transações justificadas na data e totalizar por loja e global.
- [ ] [FRONTEND/HOOKS] Atualizar `useCategorizeOrphan.ts` para invalidar queries de `['justified_transactions']`, `['daily_reconciliation_summary']` e `['daily_snapshots']`.
- [ ] [FRONTEND/COMPONENTS] Criar modal `src/components/conciliacao/FaturamentoAtualBreakdownModal.tsx` com composição visual transparente (Mapa de Metas + Tabela de Transações Justificadas).
- [ ] [FRONTEND/COMPONENTS] Atualizar `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - Renomear *Faturamento Líquido* para **Faturamento Atual**.
  - Renomear input manual para **Faturamento Mapa de Metas**.
  - Tornar o card clicável para disparar o `FaturamentoAtualBreakdownModal`.
  - Integrar a soma das transações justificadas ao cálculo de Faturamento Atual e Disponível para Contas.
- [ ] [FRONTEND/ROUTES] Atualizar `src/routes/conciliacao.index.tsx`:
  - Abater transações justificadas no cálculo do Previsto/Diferença da loja, zerando a diferença da filial justificada.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros de compilação.
- [ ] [TEST] Validar que justificar uma divergência zera a diferença da filial e eleva o Faturamento Atual com detalhamento completo no modal.
