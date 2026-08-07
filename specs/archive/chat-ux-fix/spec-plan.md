# Spec Plan: Chat UX e Comportamento da IA (chat-ux-fix)

## Tasks

- [x] [FRONTEND] Atualizar `PromptInput.tsx`: Fixar nome do modelo, adicionar seletor de "Esforço" (Low/Medium/Max) usando ícones apropriados e trocar placeholder.
- [x] [FRONTEND] Atualizar `MessageList.tsx`: Envolver as mensagens do usuário (role: user) em bolhas à direita (bg claro) e as da IA (role: assistant) em bolhas à esquerda com Avatar, bg diferenciado e bordas.
- [x] [FRONTEND] Atualizar `MessageList.tsx` (ou componente pai): Adicionar visualizaçÁo do estado das chamadas de ferramenta ("Pensando...", "Consultando Oficina...", "Processando Anexos...") lendo as tools ativas do stream da IA.
- [x] [BACKEND/PROMPT] Ajustar System Prompt no Backend (Edge Function ou config) para garantir que a IA assuma um papel mais autônomo nas respostas vagas (sempre resumindo primeiro) e evite culpar a API Externa por falta de dados quando tiver cache local.
- [x] [FRONTEND] Revisar client do Supabase (ou `useAuth.ts` / componente que dispara arquivos/áudio) para nÁo tentar realizar `grant_type=password` manualmente, valendo-se da sessÁo vigente.
- [x] [TEST] Verificar cenário 1: UI dos balões renderizada corretamente.
- [x] [TEST] Verificar cenário 2: Erro 400 no Auth foi sanado durante uploads e áudio.
