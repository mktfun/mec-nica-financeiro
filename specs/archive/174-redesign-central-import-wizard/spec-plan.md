# Spec Plan: Redesign Central Import Wizard (174)

## Tasks

- [x] [FRONTEND] Abrir `CentralImportWizard.tsx` e localizar o bloco de renderização do `importLogs.map` (onde aparece "Diário de Operações").
- [x] [FRONTEND] Substituir esse bloco pela iteração em `importStages`, renderizando `<AgentStageItem stage={stage} />` para cada passo.
- [x] [FRONTEND] Remover ou ocultar a variável `importLogs` do design se o `AgentStageItem` e o JSON Download cobrirem todo o escopo de logs. (Manter a gravação no JSON trail para auditoria, mas remover a visualização inline).
- [x] [FRONTEND] Dar polimento geral no Wizard para adotar a UI premium descrita no design.
- [x] [TEST] Verificar se a Etapa 4 renderiza as "bolinhas animadas" de progresso do `AgentStageItem` e não mais logs em formato texto simples.
