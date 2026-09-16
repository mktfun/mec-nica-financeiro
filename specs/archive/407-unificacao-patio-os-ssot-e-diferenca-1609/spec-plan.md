# Plano de Execução — Spec 407: Unificação do Pátio de OSs (SSOT) e Equalização Contábil de 16/09/2026

## Tasks

- [x] **Task 1: Sincronização do Pátio no Banco de Dados (Supabase)**
  - Executar script de correção no Supabase para equalizar `reconciliations.na_loja_os` em `2026-09-16`:
    - Loja `st-01`: Atualizar `na_loja_os = 19091.66` (incluindo OS 596).
    - Loja `st-09`: Atualizar `na_loja_os = 19837.25` (incluindo OSs 1818 e 1856).
  - Atualizar `daily_snapshots.total_patio = 83423.57` para `2026-09-16`.

- [x] **Task 2: Blindagem do Hook de Backend (`src/hooks/useBackendConciliacao.ts`)**
  - Ajustar o cálculo de `finalNaLojaOs` para priorizar a soma dinâmica da RPC `raw.na_loja_os` (R$ 83.423,57) sobre snapshots legados/desatualizados.
  - Garantir que `summary.na_loja_os` e `summary.total_patio` sempre retornem o valor consolidado canônico.

- [x] **Task 3: Blindagem do Assistente de Fechamento (`Step4FinalAuditAndClose.tsx` e `CentralImportWizard.tsx`)**
  - Garantir que `Step4FinalAuditAndClose.tsx` utilize `Number(summary?.na_loja_os || 0)` como SSOT de pátio acumulado, evitando que sessões parciais de upload sobrescrevam o somatório de OSs abertas.
  - Assegurar integridade no salvamento de snapshots futuros.

- [x] **Task 4: Validação da Consistência de UI (`ResumoDiaPanel.tsx` e `PatioOsDetailModal.tsx`)**
  - Conferir que o Card 4 ("NA LOJA OS") exibe exatamente **R$ 83.423,57**.
  - Conferir que o modal de detalhamento de OSs exibe exatamente **R$ 83.423,57** (33 OSs).
  - Verificar que o Delta de Pátio vs Marco Zero (15/09 - R$ 109.386,25) exibe **-R$ 25.962,68** tanto no Card 4 quanto no Modal.

- [x] **Task 5: Verificação de Build & Preview em Localhost 8080**
  - Rodar `npm run build` para garantir zero erros de TypeScript e compilação.
  - Confirmar que o servidor Vite na porta 8080 permanece ativo e responsivo.
