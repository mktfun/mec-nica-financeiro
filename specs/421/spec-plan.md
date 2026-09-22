# Spec 421 — Spec Plan: Sandbox de Importação e Conciliação 100% Local (Zero DB & Traqueamento Total)

## Tasks

### [MOTOR / STORAGE]
- [x] Completed: Criar módulo `src/lib/sandbox/sandboxStorage.ts` com funções tipadas para carregar, salvar, resetar e exportar sessões de reconciliação em `localStorage`. | Ref: `skills/backend-patterns` | Verificação: Inspeção estática de tipagem e integridade.
- [x] Completed: Criar sintetizador puro `src/lib/sandbox/sandboxCalculator.ts` (`buildSimulatedDailySummary`) que consolida resultados brutos do parser (`CentralImportResults`) e do motor (`AutoMatchingResult`) em um `DailyReconciliationSummary` idêntico ao retornado pela RPC do Postgres. | Ref: `skills/backend-patterns` | Verificação: Teste unitário headless com asserção dos 5 pilares contábeis.

### [FRONTEND / WIZARD]
- [x] Completed: Adaptar `src/components/importacoes/CentralImportWizard.tsx` adicionando as props `isSandbox?: boolean` e `onSandboxComplete?: (session: SandboxReconciliationSession) => void`, criando o branch de salvamento simulado em `handleConfirm` que previne qualquer escrita no Supabase. | Ref: `skills/frontend-design-pro` | Verificação: Inspeção de código garantindo zero chamadas a `supabase.from` quando `isSandbox` for verdadeiro.

### [UI / SANDBOX HUB & CONCILIAÇÃO]
- [x] Completed: Criar componente de auditoria forense `src/components/sandbox/SandboxTraceabilityPanel.tsx` exibindo abas para Matches, Órfãos com motivos de rejeição, Lotes de Cartão com taxas deduzidas, Cofre Daniel, Recebíveis e logs de execução com exportador JSON. | Ref: `skills/frontend-design-pro` | Verificação: Inspeção de renderização e tokens do Design System.
- [x] Completed: Refatorar completamente a rota `src/routes/teste.import.tsx` transformando-a no Sandbox Hub com navegação por 3 abas ("1. Importação & Motor Real", "2. Painel de Conciliação Simulada", "3. Traqueamento Total & Telemetria") eliminando qualquer mock artificial pré-fixado. | Ref: `skills/frontend-design-pro` | Verificação: Inspeção visual e de rotas do TanStack Router.

### [TERMINAL GATE]
- [x] Completed: Executar `npm run build` garantindo compilação limpa, zero erros de TypeScript e exit code 0. | Ref: `skills/sdd-apply` | Verificação: `npm run build` exit code 0.
