# Spec 422 — Spec Plan: Paridade Contábil Total e Drilldown Interativo no Sandbox de Conciliação (Zero DB)

## Tasks

### [MOTOR / CALCULATOR]
- [x] Completed: Adaptar `src/lib/sandbox/sandboxCalculator.ts` para receber `baselineD1` (snapshot D-1) e calcular com paridade contábil estrita `caixa_anterior`, `a_receber_acumulado`, `odometro_anterior`, `fluxo_caixa` e `diferenca_final`. | Ref: `skills/backend-patterns` | Verificação: Teste de cálculo com valores reais de 17/09 garantindo fluxo contábil coerente.

### [FRONTEND / WIZARD]
- [x] Completed: Em `src/components/importacoes/CentralImportWizard.tsx`, consultar o snapshot do fechamento D-1 (read-only) e repassar como `baselineD1` para `buildSimulatedDailySummary` no fechamento simulado sandbox. | Ref: `skills/frontend-design-pro` | Verificação: Inspeção de código garantindo repasse de D-1 sem mutações no banco.

### [UI / DRILLDOWN MODALS]
- [x] Completed: Criar `src/components/sandbox/modals/SandboxDrilldownModals.tsx` contendo modais especializados para Cofre (com alternador em trânsito/depositado), Pátio OS, Títulos a Receber, Faturamento e Contas a Pagar alimentados pelos dados locais da sessão. | Ref: `skills/frontend-design-pro` | Verificação: Inspeção de renderização e tokens do Design System.

### [UI / SANDBOX HUB]
- [x] Completed: Em `src/routes/teste.import.tsx`, interceptar as interações da Aba 2 de conciliação para abrir os modais de drilldown simulados ao clicar nos cards, e fornecer barra de ajustes manuais (odômetro, dinheiro MP, contas) que salva no `localStorage` e recalcula o fechamento em tempo real. | Ref: `skills/frontend-design-pro` | Verificação: Inspeção de rotas e reatividade local.

### [TERMINAL GATE]
- [x] Completed: Executar `npm run build` garantindo compilação limpa, zero erros de TypeScript e exit code 0. | Ref: `skills/sdd-apply` | Verificação: `npm run build` exit code 0.
