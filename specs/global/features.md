# Features
### Frontend

- `src/routes/custos.tsx`: Nova tela de monitoramento de custos com I.A., exibindo painel com métricas de requisições de Chat e Motor filtráveis por período (Hoje, Esta Semana, Este Mês).
- `src/routes/agente.tsx`: Interface de chat principal, agora com paginação no histórico, UI livre de overlaps no layout principal, e auto-titulação.
- `src/routes/logs.agente.tsx`: Monitoramento e telemetria, com botão de navegação nativa.
- `src/routes/logs.motor.tsx`: Refatorado com estilo de Acordeão (`<details>`) para payloads estruturados de Input/Output do Motor, e botão de navegação nativa.

- ImportaÃ§Ã£o Inteligente de RelatÃ³rios (XLS, OFX).
- Caixa FÃ­sico (Dinheiro).
- Match Triplo (OS vs Maquininha vs Banco) com D+1 [Spec 051].
- UI de ConfiguraÃ§Ãµes Remotas de Bot & Telemetria do Playwright (`src/routes/agente.tsx`, `useBotLogs.ts`).
- IntegraÃ§Ã£o MCP Nativa via Tool Calling no Vercel AI SDK (`ai-chat` e `mcp-proxy` edge functions).
- Bot Standalone com API HTTP em Express + `cors` para integraÃ§Ãµes web (Playwright Headless).
- **[oficina-system-connector]** Oficina System Connector: Bot expandido para conector sistÃªmico completo com 11 endpoints GET:
  - `GET /api/contas-pagar?loja=<slug>` â€” Contas a Pagar via Playwright (`wfContaBuscaPagar.aspx`)
  - `GET /api/contas-receber?loja=<slug>` â€” Contas a Receber (`wfContaBuscaReceber.aspx`)
  - `GET /api/agenda?loja=<slug>&data_inicio=&data_fim=` â€” Agenda (`wfAgendaCalendario.aspx`)
  - `GET /api/config/status-os?loja=<slug>` â€” Status de OS configurados
  - `GET /api/config/formas-pagamento?loja=<slug>` â€” Formas de pagamento
  - `GET /api/os/:id?loja=<slug>` â€” OS com empresa direcionada (backward compatible)
  - `GET /api/os/detalhe/:id?loja=<slug>` â€” Detalhe OS com empresa direcionada
- **[oficina-system-connector]** Mapa de Empresas: `bot/src/config/empresas.json` (10 lojas) + `bot/src/config/empresas.ts` (`resolveEmpresa()` com match por store_id, slug e aliases).
- **[oficina-system-connector]** `ensureCompany(page, idEmpresaOI)` â€” helper Playwright para troca de empresa ativa no Oficina via dropdown (`select[id*="ddlEmpresa"]`).
- **[oficina-system-connector]** `extractGrid(page, hint)` â€” helper genÃ©rico para extraÃ§Ã£o de grids ASP.NET WebForms. Retorna `[]` sem exceÃ§Ã£o se grid nÃ£o encontrada.
- **[oficina-system-connector]** 4 novas tools na Edge Function `ai-chat`: `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`, `consulta_agenda_oficina`, `consulta_config_oficina`.
- **[oficina-system-connector]** System prompt expandido com mapa de 10 lojas + 5 regras de roteamento cognitivo (local-first, loja obrigatÃ³ria, perguntar antes de chamar tool externa).

- **[chat-ux-fix]** UX do chat modernizada com componentes de loading no fluxo do MCP e isolamento correto de sessÃ£o (Supabase) evitando erros 400 em tools (Ã¡udio/upload). Componentes modificados: `PromptInput.tsx`, `MessageList.tsx`, Edge Function `ai-chat`.
- **[chat-mcp-debug-ux]** RefatoraÃ§Ã£o completa do agente de chat para usar o hook `useChat` do Vercel AI SDK no frontend (TanStack Router). O `MessageList` agora processa `toolInvocations` nativamente em tempo real e exibe a execuÃ§Ã£o das integraÃ§Ãµes (via Playwright Bot/Oficina Inteligente) em caixas de status animadas e expandÃ­veis. Melhoria no `SYSTEM_PROMPT` e tools contra alucinaÃ§Ãµes (regra "PAG" e zero-records fallback).
- **[bugfix-lovable-publish]** CorreÃ§Ã£o da falha de CI/CD no Lovable causada por desalinhamento de lockfiles (`bun.lock` vs `package-lock.json`) e `peerDependencies`. O React foi forÃ§ado para `19.2.1` e o build automatizado do PM foi isolado exclusivamente para NPM 10 via expurgo do `bun.lock`.
  
## [bugfix-ofx-import-fk]  
- Hook useBulkInsertTransactions atualizado para remover o campo id sint‚tico das transa‡äes OFX antes de executar o upsert idempotente no Supabase, evitando viola‡Æo de chave estrangeira com conciliation_matches. 
  
## [bugfix-ai-chat]  
- gente.tsx refatorado para remover o state management de UI excessivo (abas secund rias) e corrigir race conditions do useChat ao criar novas conversas (evitando stream aborts indesejados). 
  
## M¢dulo IAS Hub  
- Conectores em src/lib/graphify.ts, src/lib/claritas.ts, src/lib/ias-hub.ts.  
- Tabelas: claritas_prompts, claritas_policies, gent_reflections.  
- Edge Function: ias-hub. 
