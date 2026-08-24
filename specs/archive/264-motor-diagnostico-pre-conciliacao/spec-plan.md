# Spec Plan: Motor de Diagnóstico Pré-Conciliação no Step 3 (264)

## Tasks

- [x] [BACKEND] Confirmar que `daily_snapshots` tem índice em `date DESC` (verificar migration existente)
- [x] [FRONTEND] Criar `src/types/diagnostic.ts` com interfaces `DiagnosticSource`, `DiagnosticResult`, `DiagnosticEngineInput`
- [x] [FRONTEND] Criar hook `src/hooks/useDiagnosticEngine.ts` — busca histórico de 5 dias em `daily_snapshots`, calcula `DiagnosticResult` a partir dos inputs do wizard
- [x] [FRONTEND] Criar componente `src/components/importacoes/DiagnosticPanel.tsx` — tabela compacta de auditoria com 5 fontes, semáforo por ícone Lucide, linha de suspeita âmbar, sem linguagem de bot
- [x] [FRONTEND] Integrar `useDiagnosticEngine` no `CentralImportWizard.tsx` — passar inputs calculados (`totalOfxIn`, `totalPatioEstoqueGlobal`, `manualDinheiroMp`, `manualAReceber`, `contasManual`, `jurosRedeTotal`, `step`, `targetDate`, `isLoadingMissingOs`)
- [x] [FRONTEND] Renderizar `<DiagnosticPanel>` no `CentralImportWizard.tsx` dentro do `{step === 3}`, entre a tabela de OSs e o card de "Previsão por Loja"
- [x] [TEST] Cenário 1 — Verificar que com todos os dados preenchidos e histórico disponível, o painel exibe corretamente as 5 fontes com variação calculada
- [x] [TEST] Cenário 2 — Simular pátio divergente (forçar `totalPatioEstoqueGlobal` menor) e verificar que `mainSuspect` aponta 'patio' com nota âmbar
- [x] [TEST] Cenário 3 — Verificar que com `manualDinheiroMp=0` e `manualAReceber=0` o painel exibe nota "diagnóstico parcial" e recalcula quando o operador preenche
- [x] [TEST] Cenário 4 — Verificar que sem histórico (`snapshotDaysUsed=0`) o painel exibe apenas valores atuais sem status de semáforo
- [x] [TEST] Executar `npm run build` para validar que não há erros de TypeScript

