# Spec 426 — Spec Plan: Blindagem Operacional de Cartões REDE 100% A Compensar por Filial

## Tasks

### [FRONTEND / WIZARD]
- [x] Completed: Em `src/components/importacoes/CentralImportWizard.tsx`, desativar o update de `pos_transactions` para `settlement_status = 'entrou'` na Etapa 4.1, mantendo 100% das vendas REDE como `a_compensar` e emitindo log transparente de cartões em aberto por filial. | Ref: `skills/backend-patterns` | Verificação: Inspeção de código garantindo que `pos_transactions` permaneça estritamente com `a_compensar`.

### [FRONTEND / AUDIT]
- [x] Completed: Em `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`, desativar o update de `pos_transactions` para `entrou`, assegurando que a etapa de auditoria e fechamento preserve todas as vendas do dia como `a_compensar`. | Ref: `skills/frontend-design-pro` | Verificação: Inspeção de código confirmando ausência de mutação indevida de status.

### [BACKEND / CALCULATOR]
- [x] Completed: Em `src/lib/sandbox/sandboxCalculator.ts`, ajustar `nao_entrou_valor` para manter 100% das vendas líquidas da Rede no ativo a compensar (sem zerar por `isApproved` ou por créditos OFX), alinhando o sandbox ao comportamento de produção. | Ref: `skills/backend-patterns` | Verificação: Teste de cálculo garantindo preservação integral de `rede.liquido`.

### [FRONTEND / MODAL RAIO-X]
- [x] Completed: Em `src/components/conciliacao/SaldoBancosDetailModal.tsx` e `src/hooks/useBackendConciliacao.ts`, blindar a apuração de `maquininhaNaoEntrou` para que todas as filiais com vendas REDE exibam seus valores reais na coluna verde "A Compensar" e badge correspondente. | Ref: `skills/frontend-design-pro` | Verificação: Inspeção de renderização no modal confirmando que nenhuma filial com cartão exiba `-`.

### [TERMINAL GATE]
- [x] Completed: Execução de `npm run build` assegurando compilação limpa, zero erros de TypeScript e exit code 0. | Ref: `skills/sdd-apply` | Verificação: `npm run build` com exit code 0.
