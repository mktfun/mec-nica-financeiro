# Spec Plan: Agent Flow Expandable & Live Preview (161v2)

## Tasks

- [x] [FRONTEND] Criar o componente \`AgentStageItem.tsx\` que renderiza um Collapsible animado via Framer Motion, recebendo as \`subSteps\` (logs filhos).
- [x] [FRONTEND] Criar \`src/components/importacoes/AgentRunnerModal.tsx\`. Construir o mock/motor de estado para evoluir os \`subSteps\` ("passo y", "analisando arquivo X") progressivamente e coordenar as sanfonas (abre a que está rodando, fecha as prontas).
- [x] [FRONTEND] Conectar o botão "Iniciar" do Modal à chamada real \`supabase.functions.invoke('sync-oficina')\`.
- [x] [FRONTEND] Criar rotina de Polling (Supabase Select) no passo final ("Injetado com sucesso") garantindo que os dados caíram no banco antes de habilitar o botão de Preview.
- [x] [FRONTEND] Modificar \`CentralImportWizard.tsx\`. O botão Sincronizar (nuvem) agora abre o \`AgentRunnerModal\`. O \`onSuccess\` do Modal avança o step do Wizard para 3 e acopla os arrays de dados raspados.
- [x] [TEST] Verificar UI visualmente: As caixas abrem e fecham como a Vercel/ChatGPT? O design é premium e sem glassmorphism, fundo Zinc-950 sólido?
