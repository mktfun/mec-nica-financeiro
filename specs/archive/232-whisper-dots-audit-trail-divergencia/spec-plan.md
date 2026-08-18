# Spec Plan: Whisper Dots + Audit Trail (Spec 232)

## Tasks

- [x] [HOOK] Criar `src/hooks/useReconciliationInsights.ts` com inteligência de cruzamento de dados.
- [x] [COMPONENT] Criar `src/components/conciliacao/WhisperDot.tsx` para exibição sutil nos 5 pilares.
- [x] [COMPONENT] Criar `src/components/conciliacao/AuditTrailBar.tsx` para a barra colapsável de auditoria.
- [x] [INTEGRATE] Integrar WhisperDots e AuditTrailBar no `src/components/conciliacao/ResumoDiaPanel.tsx`.
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npx tsc --noEmit && npm run build"` garantindo 0 erros.
- [x] [GIT/SYNC] Sincronizar branches `main` e `master` no GitHub.
