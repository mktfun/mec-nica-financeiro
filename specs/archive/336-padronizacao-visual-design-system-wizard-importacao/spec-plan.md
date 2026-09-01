# Spec Plan: Padronização Visual e Unificação do Design System do Wizard de Importação e Conciliação (336)

## Tasks

- [ ] [FRONTEND] Atualizar `src/components/importacoes/CentralImportWizard.tsx` implementando o **Stepper Superior Unificado (5 Fases)**, substituindo variáveis legadas `var(--...)` por Tailwind Dark UI Zinc-950 puro, e padronizando a seção de Inputs Manuais com travas visuais `Lock`/`Unlock`
- [ ] [FRONTEND] Atualizar `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx` com tabelas Dark Zinc-950, tipografia `font-mono tabular-nums`, badges semânticas e botões de vínculo padronizados
- [ ] [FRONTEND] Atualizar `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx` com tab navigation refinada, cards de débitos/créditos em `bg-zinc-900/60 border-zinc-800` e toggles destacados de impacto contábil
- [ ] [FRONTEND] Atualizar `src/components/importacoes/wizard/Step3CashVaultDaniel.tsx` com seletores `[SIM]` / `[NÃO]` Dark UI e tabela de valores em trânsito `font-mono tabular-nums`
- [ ] [FRONTEND] Atualizar `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` com 5 Header Cards canônicos, Hero Card do Semáforo Contábil e bloco monospaced da equação contábil
- [ ] [FRONTEND] Atualizar componentes auxiliares (`DiagnosticPanel.tsx`, `MissingPatioOsEditor.tsx`, `AgentStageItem.tsx`, `MarcoZeroWizard.tsx`, `src/routes/importacoes.tsx`) expurgando variáveis CSS legadas e garantindo harmonia visual 100%
- [ ] [TEST] Executar `cmd.exe /c "npm run build"` garantindo 0 erros de tipagem TypeScript, Client, SSR e Nitro
- [ ] [TEST] Executar Cenário 1 e 2 via script Playwright capturando screenshots do Wizard padronizado em 1440px e realizando verificação VLM
