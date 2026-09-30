# 📋 Plano de Execução Técnica — Spec 457: Remoção Completa do Cockpit

## Fase 1: Desacoplamento & Remoção de Componentes e Tipos [FRONTEND]
- [x] Task 1.1: Editar `src/components/importacoes/CentralImportWizard.tsx` removendo cirurgicamente o import de `PostMotorDiagnosticCockpit` e o bloco de renderização JSX condicional do Cockpit no Step 8 quando `saveFinished` for verdadeiro.
  - *Skill Canônica:* `frontend-design-pro`
  - *Verificação:* `cmd.exe /c "npm run build"`
- [x] Task 1.2: Deletar os 3 componentes e o arquivo de tipos exclusivos do Cockpit: `src/components/importacoes/wizard/PostMotorDiagnosticCockpit.tsx`, `src/components/importacoes/wizard/DiagnosticActionCards.tsx`, `src/components/importacoes/wizard/StoreDiagnosticRow.tsx` e `src/types/cockpit360.ts`.
  - *Skill Canônica:* `frontend-design-pro`
  - *Verificação:* `node -e "const fs = require('fs'); ['src/components/importacoes/wizard/PostMotorDiagnosticCockpit.tsx', 'src/components/importacoes/wizard/DiagnosticActionCards.tsx', 'src/components/importacoes/wizard/StoreDiagnosticRow.tsx', 'src/types/cockpit360.ts'].forEach(f => { if(fs.existsSync(f)) throw new Error('File exists: ' + f); }); console.log('All Cockpit files deleted successfully');"`

## Fase 2: Limpeza de Scripts, Mídias e Documentação [CHORE/DOCS]
- [x] Task 2.1: Deletar os scripts de teste e screenshots exclusivos legados: `scripts/test-spec-384-cockpit.cjs`, `scripts/screenshot-cockpit-28.mjs`, `e2e-results/screenshots/cockpit_dia_28082026_oficial.png` e `e2e-results/screenshots/step_09_cockpit_resumo_dia_27082026.png`.
  - *Skill Canônica:* `github-ops`
  - *Verificação:* `git status -s`
- [x] Task 2.2: Atualizar cirurgicamente `TEST_READY.md` para remover menção a `PostMotorDiagnosticCockpit.tsx`.
  - *Skill Canônica:* `deploy-production`
  - *Verificação:* `git diff TEST_READY.md`

## Fase 3: Quality Gate & Testes Automatizados [SECURITY/TEST]
- [x] Task 3.1: Criar e executar a suíte de testes `tests/e2e/tier2_boundary/spec457_remover_cockpit_audit.test.mjs` cobrindo ausência de referências/imports do Cockpit em `src/`, ausência física dos arquivos apagados, e preservação íntegra dos serviços compartilhados em `useBackendConciliacao.ts` (`usePosTripleReconciliation`).
  - *Skill Canônica:* `backend-patterns`
  - *Verificação:* `cmd.exe /c "node --test tests/e2e/tier2_boundary/spec457_remover_cockpit_audit.test.mjs"`
- [x] Task 3.2: Executar o Terminal Gate de compilação de produção (`npm run build`) para assegurar 0 erros de TypeScript e empacotamento completo.
  - *Skill Canônica:* `deploy-production`
  - *Verificação:* `cmd.exe /c "npm run build"`
