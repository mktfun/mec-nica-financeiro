# Spec Plan: Redesign do Painel de Orquestração dos Agentes de Importação (230)

## Tasks

- [ ] [FRONTEND/COMPONENTS] Redesenhar `src/components/importacoes/AgentStageItem.tsx`:
  - Visual futurista e limpo para cada agente especialista com ícones, badges de estado e micro-animações.
- [ ] [FRONTEND/VIEWS] Atualizar a Etapa 4 em `src/components/importacoes/CentralImportWizard.tsx`:
  - Remover os 4 cards estáticos e a barra pesada no topo.
  - Centralizar 100% no fluxo de orquestração dos agentes, telemetria e console de logs.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros.
- [ ] [GIT/SYNC] Sincronizar branches `main` e `master` no GitHub.
