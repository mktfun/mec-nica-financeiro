# Spec Plan — 440: ModalKpiCard Unificado

## [FRONTEND] — Componente Novo

- [x] Completed | [FRONTEND] Criar src/components/ui/ModalKpiCard.tsx com interface completa (color, variant, danger, interactive, actionLabel, subtitleExtra, icon)
  Skill: ui-components + DESIGN.md
  Verificacao: tsc --noEmit sem erros

## [FRONTEND] — Substituicoes nos Modais (cirurgica, sem tocar logica)

- [x] Completed | [FRONTEND] PatioOsDetailModal.tsx: substituir 4x <Card className="border-l-4..."> por <ModalKpiCard variant="border-l" ...>
  Verificacao: build limpo + visual identico

- [x] Completed | [FRONTEND] SaldoBancosDetailModal.tsx: substituir 4-5x <div> KPI inline por <ModalKpiCard>; card Cheque Especial usa danger={hasNegativo}; card Cofre usa interactive={true} onClick={...}
  Verificacao: build limpo + card vermelho presente quando saldo negativo

- [x] Completed | [FRONTEND] CashVaultCompositionModal.tsx: substituir 4x <div> KPI inline por <ModalKpiCard>
  Verificacao: build limpo + metricas identicas

## [SECURITY/TEST] — Quality Gate

- [x] Completed | [SECURITY/TEST] npm run build — build limpo sem erros de TypeScript
  Verificacao: exit code 0
