# 📋 Spec Plan — Spec 391: Correção da Divergência Edit vs Normal no Faturamento e Encadeamento do Odômetro

## [FRONTEND] Unificação das Fórmulas e Estados em ResumoDiaPanel
- [x] Task 1: Atualizar [`ResumoDiaPanel.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/ResumoDiaPanel.tsx) para:
  1. Priorizar `currentSnapshot.metadata.faturamento_oi_base` e `currentSnapshot.faturamento` sobre `summary?.faturamento_oi_base` no modo normal.
  2. Garantir que `valorDispContasCalculado` e `diferencaFinalCalculada` sejam calculados estritamente pela fórmula contábil (`Faturamento - Fluxo` e `Disp - Contas`) em ambos os modos (edição e normal), eliminando o descompasso de -R$ 5.647,26 vs -R$ 42.615,80.
  - *Skill*: `ui-components`
  - *Verificação*: Conferir se ambos os modos exibem R$ 82.523,16, R$ 26.561,98 e -R$ 5.647,26.

- [x] Task 2: Atualizar [`useBackendConciliacao.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useBackendConciliacao.ts) em `useDailyReconciliationSummary` para enriquecer `rawSummary` com os dados persistidos de `daily_snapshots` (faturamento líquido e metadados), protegendo o resumo contra a subtração incorreta da RPC.
  - *Skill*: `backend-patterns`
  - *Verificação*: Validar se o hook retorna `faturamento_oi_base = 82523.16` e `diferenca_final = -5647.26`.

- [x] Task 3: Atualizar [`CentralImportWizard.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/importacoes/CentralImportWizard.tsx) removendo a leitura indevida de `previousMonthClosing = previousSnapshot?.faturamento` para não poluir futuras importações.
  - *Skill*: `ui-components`
  - *Verificação*: Verificar integridade do assistente de importação.

## [TEST / AUDIT] Verificação e Build Gate
- [x] Task 4: Executar simulação ponta a ponta dos dois modos (Edit e Normal) com os dados de 14/09 e certificar paridade absoluta.
  - *Skill*: `backend-patterns`
  - *Verificação*: Saída do script comprovando paridade total.

- [x] Task 5: Executar Terminal Build Gate (`npm run build`).
  - *Skill*: `deploy-production`
  - *Verificação*: Compilação Vite/Nitro com 0 erros.
