# Spec Plan: Correção de Dependência Descarregável llm-matcher (309)

## Tasks
- [x] [FRONTEND] Validar integridade e sintaxe de `src/lib/llm-matcher.ts` e exportações requeridas por `CentralImportWizard.tsx`.
- [x] [TEST] Executar compilação completa de produção com `node node_modules/vite/bin/vite.js build`.
- [x] [GIT] Adicionar `src/lib/llm-matcher.ts` ao Git e realizar commit `fix(309): incluir modulo llm-matcher no versionamento para desobstruir build remoto`.
- [x] [DEPLOY] Realizar `git push origin main` para restaurar o deploy automático remoto.
