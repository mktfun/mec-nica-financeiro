# Features
### Frontend

- `src/routes/custos.tsx`: Nova tela de monitoramento de custos com I.A., exibindo painel com mÃ©tricas de requisiÃ§Ãµes de Chat e Motor filtrÃ¡veis por perÃ­odo (Hoje, Esta Semana, Este MÃªs).
- `src/routes/agente.tsx`: Interface de chat principal, agora com paginaÃ§Ã£o no histÃ³rico, UI livre de overlaps no layout principal, e auto-titulaÃ§Ã£o.
- `src/routes/logs.agente.tsx`: Monitoramento e telemetria, com botÃ£o de navegaÃ§Ã£o nativa.
- `src/routes/logs.motor.tsx`: Refatorado com estilo de AcordeÃ£o (`<details>`) para payloads estruturados de Input/Output do Motor, e botÃ£o de navegaÃ§Ã£o nativa.

- ImportaÃƒÂ§ÃƒÂ£o Inteligente de RelatÃƒÂ³rios (XLS, OFX).
- Caixa FÃƒÂ­sico (Dinheiro).
- Match Triplo (OS vs Maquininha vs Banco) com D+1 [Spec 051].
- UI de ConfiguraÃƒÂ§ÃƒÂµes Remotas de Bot & Telemetria do Playwright (`src/routes/agente.tsx`, `useBotLogs.ts`).
- IntegraÃƒÂ§ÃƒÂ£o MCP Nativa via Tool Calling no Vercel AI SDK (`ai-chat` e `mcp-proxy` edge functions).
- Bot Standalone com API HTTP em Express + `cors` para integraÃƒÂ§ÃƒÂµes web (Playwright Headless).
- **[oficina-system-connector]** Oficina System Connector: Bot expandido para conector sistÃƒÂªmico completo com 11 endpoints GET:
  - `GET /api/contas-pagar?loja=<slug>` Ã¢â‚¬â€� Contas a Pagar via Playwright (`wfContaBuscaPagar.aspx`)
  - `GET /api/contas-receber?loja=<slug>` Ã¢â‚¬â€� Contas a Receber (`wfContaBuscaReceber.aspx`)
  - `GET /api/agenda?loja=<slug>&data_inicio=&data_fim=` Ã¢â‚¬â€� Agenda (`wfAgendaCalendario.aspx`)
  - `GET /api/config/status-os?loja=<slug>` Ã¢â‚¬â€� Status de OS configurados
  - `GET /api/config/formas-pagamento?loja=<slug>` Ã¢â‚¬â€� Formas de pagamento
  - `GET /api/os/:id?loja=<slug>` Ã¢â‚¬â€� OS com empresa direcionada (backward compatible)
  - `GET /api/os/detalhe/:id?loja=<slug>` Ã¢â‚¬â€� Detalhe OS com empresa direcionada
- **[oficina-system-connector]** Mapa de Empresas: `bot/src/config/empresas.json` (10 lojas) + `bot/src/config/empresas.ts` (`resolveEmpresa()` com match por store_id, slug e aliases).
- **[oficina-system-connector]** `ensureCompany(page, idEmpresaOI)` Ã¢â‚¬â€� helper Playwright para troca de empresa ativa no Oficina via dropdown (`select[id*="ddlEmpresa"]`).
- **[oficina-system-connector]** `extractGrid(page, hint)` Ã¢â‚¬â€� helper genÃƒÂ©rico para extraÃƒÂ§ÃƒÂ£o de grids ASP.NET WebForms. Retorna `[]` sem exceÃƒÂ§ÃƒÂ£o se grid nÃƒÂ£o encontrada.
- **[oficina-system-connector]** 4 novas tools na Edge Function `ai-chat`: `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`, `consulta_agenda_oficina`, `consulta_config_oficina`.
- **[oficina-system-connector]** System prompt expandido com mapa de 10 lojas + 5 regras de roteamento cognitivo (local-first, loja obrigatÃƒÂ³ria, perguntar antes de chamar tool externa).

- **[chat-ux-fix]** UX do chat modernizada com componentes de loading no fluxo do MCP e isolamento correto de sessÃƒÂ£o (Supabase) evitando erros 400 em tools (ÃƒÂ¡udio/upload). Componentes modificados: `PromptInput.tsx`, `MessageList.tsx`, Edge Function `ai-chat`.
- **[chat-mcp-debug-ux]** RefatoraÃƒÂ§ÃƒÂ£o completa do agente de chat para usar o hook `useChat` do Vercel AI SDK no frontend (TanStack Router). O `MessageList` agora processa `toolInvocations` nativamente em tempo real e exibe a execuÃƒÂ§ÃƒÂ£o das integraÃƒÂ§ÃƒÂµes (via Playwright Bot/Oficina Inteligente) em caixas de status animadas e expandÃƒÂ­veis. Melhoria no `SYSTEM_PROMPT` e tools contra alucinaÃƒÂ§ÃƒÂµes (regra "PAG" e zero-records fallback).
- **[bugfix-lovable-publish]** CorreÃƒÂ§ÃƒÂ£o da falha de CI/CD no Lovable causada por desalinhamento de lockfiles (`bun.lock` vs `package-lock.json`) e `peerDependencies`. O React foi forÃƒÂ§ado para `19.2.1` e o build automatizado do PM foi isolado exclusivamente para NPM 10 via expurgo do `bun.lock`.
  
## [bugfix-ofx-import-fk]  
- Hook useBulkInsertTransactions atualizado para remover o campo id sintâ€štico das transaâ€¡Ã¤es OFX antes de executar o upsert idempotente no Supabase, evitando violaâ€¡Ã†o de chave estrangeira com conciliation_matches. 
  
## [bugfix-ai-chat]  
- gente.tsx refatorado para remover o state management de UI excessivo (abas secundÂ rias) e corrigir race conditions do useChat ao criar novas conversas (evitando stream aborts indesejados). 
  
## MÂ¢dulo IAS Hub  
- Conectores em src/lib/graphify.ts, src/lib/claritas.ts, src/lib/ias-hub.ts.  
- Tabelas: claritas_prompts, claritas_policies, gent_reflections.  
- Edge Function: ias-hub. 

- **[076] Snapshot Histórico Pátio:** Tabela econciliations agora possui 
a_loja_os. Bootstrap coleta 'Pátio Pendente' para preencher caixa_atual e evitar bugs de fluxo de caixa.
- Modificado: src/lib/parsers/ofxParser.ts (LÃ³gica de centavos aplicada tambÃ©m em SALDO ANTERIOR)
- Modificado: src/components/importacoes/CentralImportWizard.tsx (Captura e pipeline de storePreviousBalances)
- Modificado: src/hooks/useTransactions.ts (upsert de previous_balance na tabela reconciliations)
- Modificado: src/components/conciliacao/ResumoDiaPanel.tsx (Uso do previous_balance nativo)
- Modificado: src/hooks/useDashboardV2.ts (Uso do previous_balance nativo no Fluxo de Caixa)
- Banco: Tabela reconciliations recebeu coluna previous_balance (NUMERIC)

## [092-fix-faturamento-math]
- Faturamento Baseado em Conciliação Real
- Modificado: `src/hooks/useConciliacao.ts` (retorno de `pix_os_expected` e `faturamento_real_ofx` extraído dos matches)
- Modificado: `src/components/conciliacao/ResumoDiaPanel.tsx` (nova matemática da balança de diferenças e `faturamentoOutrosAutomatico = 0`)
- Modificado: `src/routes/conciliacao.index.tsx` (Faturamento Atual amarrado à liquidez bancária)

## [093-fix-faturamento-visor]
- Otimização Visual do Faturamento Diário
- Modificado: `src/routes/conciliacao.index.tsx` (Faturamento = Maquininha + PIX Matemático)
- Modificado: `src/components/conciliacao/ResumoDiaPanel.tsx` (Exibição de `Ant:` para Faturamento Anterior no card Consolidação)

## [094-fix-import-wipeout]
- Correção Crítica do Mecanismo de Importação (Fim do Wipeout)
- Modificado: `src/hooks/useTransactions.ts` (Removido delete-and-insert do OFX e restringido o delete da Rede apenas aos sources de origem, protegendo lançamentos manuais)

## [095-fix-pix-match-text]
- Remoção do Filtro Restritivo de Texto do PIX e Restauração do Faturamento Real
- Modificado: `src/hooks/useConciliacao.ts` (Remoção da restrição textual `includes('PIX')` no cruzamento matemático do Extrato)
- Modificado: `src/routes/conciliacao.index.tsx` (Substituição do Faturamento Baseado em Texto por Faturamento de Amarração Real do Banco de Dados)

## [096-fix-math-rage]
- Alinhamento Matemático de "Planilha vs Banco" e Snapshots de Pátio
- Modificado: `src/components/importacoes/CentralImportWizard.tsx` (Adicionado Snapshot instantâneo do Pátio `na_loja_os` para blindagem de dados históricos)
- Modificado: `src/routes/conciliacao.index.tsx` (Alterado o Faturamento para ser puramente o saldo validado do extrato `saldo_banco_itau`, sem mistura com planilhas)
- Modificado: `src/lib/modulo1Calculations.ts` (Remoção de Provisão do fluxo de despesas pagas no dia)
- Modificado: `src/components/conciliacao/ResumoDiaPanel.tsx` (Ajustado `contasAPagarAutomatico` para capturar as saídas OFX em valor absoluto)
