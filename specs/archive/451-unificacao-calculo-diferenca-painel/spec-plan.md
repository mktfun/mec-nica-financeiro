# Spec Plan — Spec 451: Unificação do Cálculo de Diferença Final e Subtotal Contas

## Tasks

### Fase 1: Hook de Conciliação (`useBackendConciliacao.ts`)
- [x] Task 1.1: Adicionar flag `isSnapshotClosed = Boolean(snapshotData?.is_closed && !forceDynamic)` e blindar leitura de `contas_base`, `subtotal_contas`, `valor_disp_contas` e `diferenca_final` a partir de `snapshotData` / `snapMeta` em dias fechados.
- [x] Task 1.2: Manter recálculo dinâmico preciso para dias abertos ou com `forceDynamic: true`.

### Fase 2: Componente do Painel (`ResumoDiaPanel.tsx`)
- [x] Task 2.1: Harmonizar `contasManualValor` e `subtotalContasCalculado` para que usem a mesma base canônica do hook e do snapshot.
- [x] Task 2.2: Ajustar `canonicalDiferencaFinal` para garantir identidade matemática estrita com os cards de Valor Disponível e Subtotal Contas.

### Fase 3: Validação Automatizada e Quality Gate
- [x] Task 3.1: Criar teste E2E `tests/e2e/tier2_boundary/spec451_dashboard_reconciliation_math.test.mjs` validando o cálculo de 2026-09-29 e a invariância do salvamento.
- [x] Task 3.2: Executar `npm run build` e teste E2E garantindo 0 erros de compilação e 100% de coerência contábil.
