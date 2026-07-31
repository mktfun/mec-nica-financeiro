# Features
- Importação Inteligente de Relatórios (XLS, OFX).
- Caixa Físico (Dinheiro).
- Match Triplo (OS vs Maquininha vs Banco) com D+1 [Spec 051].
- UI de Configurações Remotas de Bot & Telemetria do Playwright (`src/routes/agente.tsx`, `useBotLogs.ts`).
- Integração MCP Nativa via Tool Calling no Vercel AI SDK (`ai-chat` e `mcp-proxy` edge functions).
- Bot Standalone com API HTTP em Express + `cors` para integrações web (Playwright Headless).
- **[oficina-system-connector]** Oficina System Connector: Bot expandido para conector sistêmico completo com 11 endpoints GET:
  - `GET /api/contas-pagar?loja=<slug>` — Contas a Pagar via Playwright (`wfContaBuscaPagar.aspx`)
  - `GET /api/contas-receber?loja=<slug>` — Contas a Receber (`wfContaBuscaReceber.aspx`)
  - `GET /api/agenda?loja=<slug>&data_inicio=&data_fim=` — Agenda (`wfAgendaCalendario.aspx`)
  - `GET /api/config/status-os?loja=<slug>` — Status de OS configurados
  - `GET /api/config/formas-pagamento?loja=<slug>` — Formas de pagamento
  - `GET /api/os/:id?loja=<slug>` — OS com empresa direcionada (backward compatible)
  - `GET /api/os/detalhe/:id?loja=<slug>` — Detalhe OS com empresa direcionada
- **[oficina-system-connector]** Mapa de Empresas: `bot/src/config/empresas.json` (10 lojas) + `bot/src/config/empresas.ts` (`resolveEmpresa()` com match por store_id, slug e aliases).
- **[oficina-system-connector]** `ensureCompany(page, idEmpresaOI)` — helper Playwright para troca de empresa ativa no Oficina via dropdown (`select[id*="ddlEmpresa"]`).
- **[oficina-system-connector]** `extractGrid(page, hint)` — helper genérico para extração de grids ASP.NET WebForms. Retorna `[]` sem exceção se grid não encontrada.
- **[oficina-system-connector]** 4 novas tools na Edge Function `ai-chat`: `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`, `consulta_agenda_oficina`, `consulta_config_oficina`.
- **[oficina-system-connector]** System prompt expandido com mapa de 10 lojas + 5 regras de roteamento cognitivo (local-first, loja obrigatória, perguntar antes de chamar tool externa).

- **[chat-ux-fix]** UX do chat modernizada com componentes de loading no fluxo do MCP e isolamento correto de sessão (Supabase) evitando erros 400 em tools (áudio/upload). Componentes modificados: `PromptInput.tsx`, `MessageList.tsx`, Edge Function `ai-chat`.
- **[chat-mcp-debug-ux]** Refatoração completa do agente de chat para usar o hook `useChat` do Vercel AI SDK no frontend (TanStack Router). O `MessageList` agora processa `toolInvocations` nativamente em tempo real e exibe a execução das integrações (via Playwright Bot/Oficina Inteligente) em caixas de status animadas e expandíveis. Melhoria no `SYSTEM_PROMPT` e tools contra alucinações (regra "PAG" e zero-records fallback).
- **[bugfix-lovable-publish]** Correção da falha de CI/CD no Lovable causada por desalinhamento de lockfiles (`bun.lock` vs `package-lock.json`) e `peerDependencies`. O React foi forçado para `19.2.1` e o build automatizado do PM foi isolado exclusivamente para NPM 10 via expurgo do `bun.lock`.
  
## [bugfix-ofx-import-fk]  
- Hook useBulkInsertTransactions atualizado para remover o campo id sint�tico das transa��es OFX antes de executar o upsert idempotente no Supabase, evitando viola��o de chave estrangeira com conciliation_matches. 
  
## [bugfix-ai-chat]  
- gente.tsx refatorado para remover o state management de UI excessivo (abas secund�rias) e corrigir race conditions do useChat ao criar novas conversas (evitando stream aborts indesejados). 
  
## M�dulo IAS Hub  
- Conectores em src/lib/graphify.ts, src/lib/claritas.ts, src/lib/ias-hub.ts.  
- Tabelas: claritas_prompts, claritas_policies, gent_reflections.  
- Edge Function: ias-hub. 
