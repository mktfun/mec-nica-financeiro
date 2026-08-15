# Spec Plan: 209-justify-orphan-ofx-and-store-card-revenue-sync

## Tasks

- [x] [HOOK] Em `src/hooks/useConciliacao.ts` (`useReconciliationViews`), somar o faturamento de cartão das entradas de maquininha do OFX da filial para preencher o faturamento de cartão sem deixar zerado.
- [x] [HOOK] Em `src/hooks/useConciliacao.ts`, incluir campos `manual_category` e `manual_justification` no retorno das transações de `ofxSemMatch`.
- [x] [UI] Em `src/components/conciliacao/OfxSemMatchTable.tsx`, adicionar botão **"Justificar Entrada"**, modal de categorização `OrphanCategorizationModal` e badges de categoria aplicada.
- [x] [BACKEND/DASHBOARD] Em `src/components/conciliacao/ResumoDiaPanel.tsx` e `useDashboardV2.ts`, somar o total de receitas justificadas (`faturamento_outros_valor`) ao Faturamento Total do Dia e abater da Diferença Final para zerar a conciliação.
- [x] [TEST] Executar `cmd.exe /c "npm run build"` para validação técnica com 0 erros.
