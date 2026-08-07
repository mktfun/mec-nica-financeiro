# Features
### Frontend

- `src/routes/custos.tsx`: Nova tela de monitoramento de custos com I.A., exibindo painel com métricas de requisições de Chat e Motor filtráveis por período (Hoje, Esta Semana, Este Mês).
- `src/routes/agente.tsx`: Interface de chat principal, agora com paginaçÁo no histórico, UI livre de overlaps no layout principal, e auto-titulaçÁo.
- `src/routes/logs.agente.tsx`: Monitoramento e telemetria, com botÁo de navegaçÁo nativa.
- `src/routes/logs.motor.tsx`: Refatorado com estilo de AcordeÁo (`<details>`) para payloads estruturados de Input/Output do Motor, e botÁo de navegaçÁo nativa.

- ImportaÁƒÂ§ÁƒÂ£o Inteligente de RelatÁƒÂ³rios (XLS, OFX).
- Caixa FÁƒÂ­sico (Dinheiro).
- Match Triplo (OS vs Maquininha vs Banco) com D+1 [Spec 051].
- UI de ConfiguraÁƒÂ§ÁƒÂµes Remotas de Bot & Telemetria do Playwright (`src/routes/agente.tsx`, `useBotLogs.ts`).
- IntegraÁƒÂ§ÁƒÂ£o MCP Nativa via Tool Calling no Vercel AI SDK (`ai-chat` e `mcp-proxy` edge functions).
- Bot Standalone com API HTTP em Express + `cors` para integraÁƒÂ§ÁƒÂµes web (Playwright Headless).
- **[oficina-system-connector]** Oficina System Connector: Bot expandido para conector sistÁƒÂªmico completo com 11 endpoints GET:
  - `GET /api/contas-pagar?loja=<slug>` ââ‚¬â€� Contas a Pagar via Playwright (`wfContaBuscaPagar.aspx`)
  - `GET /api/contas-receber?loja=<slug>` ââ‚¬â€� Contas a Receber (`wfContaBuscaReceber.aspx`)
  - `GET /api/agenda?loja=<slug>&data_inicio=&data_fim=` ââ‚¬â€� Agenda (`wfAgendaCalendario.aspx`)
  - `GET /api/config/status-os?loja=<slug>` ââ‚¬â€� Status de OS configurados
  - `GET /api/config/formas-pagamento?loja=<slug>` ââ‚¬â€� Formas de pagamento
  - `GET /api/os/:id?loja=<slug>` ââ‚¬â€� OS com empresa direcionada (backward compatible)
  - `GET /api/os/detalhe/:id?loja=<slug>` ââ‚¬â€� Detalhe OS com empresa direcionada
- **[oficina-system-connector]** Mapa de Empresas: `bot/src/config/empresas.json` (10 lojas) + `bot/src/config/empresas.ts` (`resolveEmpresa()` com match por store_id, slug e aliases).
- **[oficina-system-connector]** `ensureCompany(page, idEmpresaOI)` ââ‚¬â€� helper Playwright para troca de empresa ativa no Oficina via dropdown (`select[id*="ddlEmpresa"]`).
- **[oficina-system-connector]** `extractGrid(page, hint)` ââ‚¬â€� helper genÁƒÂ©rico para extraÁƒÂ§ÁƒÂ£o de grids ASP.NET WebForms. Retorna `[]` sem exceÁƒÂ§ÁƒÂ£o se grid nÁƒÂ£o encontrada.
- **[oficina-system-connector]** 4 novas tools na Edge Function `ai-chat`: `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`, `consulta_agenda_oficina`, `consulta_config_oficina`.
- **[oficina-system-connector]** System prompt expandido com mapa de 10 lojas + 5 regras de roteamento cognitivo (local-first, loja obrigatÁƒÂ³ria, perguntar antes de chamar tool externa).

- **[chat-ux-fix]** UX do chat modernizada com componentes de loading no fluxo do MCP e isolamento correto de sessÁƒÂ£o (Supabase) evitando erros 400 em tools (ÁƒÂ¡udio/upload). Componentes modificados: `PromptInput.tsx`, `MessageList.tsx`, Edge Function `ai-chat`.
- **[chat-mcp-debug-ux]** RefatoraÁƒÂ§ÁƒÂ£o completa do agente de chat para usar o hook `useChat` do Vercel AI SDK no frontend (TanStack Router). O `MessageList` agora processa `toolInvocations` nativamente em tempo real e exibe a execuÁƒÂ§ÁƒÂ£o das integraÁƒÂ§ÁƒÂµes (via Playwright Bot/Oficina Inteligente) em caixas de status animadas e expandÁƒÂ­veis. Melhoria no `SYSTEM_PROMPT` e tools contra alucinaÁƒÂ§ÁƒÂµes (regra "PAG" e zero-records fallback).
- **[bugfix-lovable-publish]** CorreÁƒÂ§ÁƒÂ£o da falha de CI/CD no Lovable causada por desalinhamento de lockfiles (`bun.lock` vs `package-lock.json`) e `peerDependencies`. O React foi forÁƒÂ§ado para `19.2.1` e o build automatizado do PM foi isolado exclusivamente para NPM 10 via expurgo do `bun.lock`.
  
## [bugfix-ofx-import-fk]  
- Hook useBulkInsertTransactions atualizado para remover o campo id sintâ€štico das transaâ€¡Á¤es OFX antes de executar o upsert idempotente no Supabase, evitando violaâ€¡Á†o de chave estrangeira com conciliation_matches. 
  
## [bugfix-ai-chat]  
- gente.tsx refatorado para remover o state management de UI excessivo (abas secundÂ rias) e corrigir race conditions do useChat ao criar novas conversas (evitando stream aborts indesejados). 
  
## MÂ¢dulo IAS Hub  
- Conectores em src/lib/graphify.ts, src/lib/claritas.ts, src/lib/ias-hub.ts.  
- Tabelas: claritas_prompts, claritas_policies, gent_reflections.  
- Edge Function: ias-hub. 

- **[076] Snapshot Histórico Pátio:** Tabela econciliations agora possui 
a_loja_os. Bootstrap coleta 'Pátio Pendente' para preencher caixa_atual e evitar bugs de fluxo de caixa.
- Modificado: src/lib/parsers/ofxParser.ts (Lógica de centavos aplicada também em SALDO ANTERIOR)
- Modificado: src/components/importacoes/CentralImportWizard.tsx (Captura e pipeline de storePreviousBalances)
- Modificado: src/hooks/useTransactions.ts (upsert de previous_balance na tabela reconciliations)
- Modificado: src/components/conciliacao/ResumoDiaPanel.tsx (Uso do previous_balance nativo)
- Modificado: src/hooks/useDashboardV2.ts (Uso do previous_balance nativo no Fluxo de Caixa)
- Banco: Tabela reconciliations recebeu coluna previous_balance (NUMERIC)

## [092-fix-faturamento-math]
- Faturamento Baseado em ConciliaçÁo Real
- Modificado: `src/hooks/useConciliacao.ts` (retorno de `pix_os_expected` e `faturamento_real_ofx` extraído dos matches)
- Modificado: `src/components/conciliacao/ResumoDiaPanel.tsx` (nova matemática da balança de diferenças e `faturamentoOutrosAutomatico = 0`)
- Modificado: `src/routes/conciliacao.index.tsx` (Faturamento Atual amarrado à liquidez bancária)

## [093-fix-faturamento-visor]
- OtimizaçÁo Visual do Faturamento Diário
- Modificado: `src/routes/conciliacao.index.tsx` (Faturamento = Maquininha + PIX Matemático)
- Modificado: `src/components/conciliacao/ResumoDiaPanel.tsx` (ExibiçÁo de `Ant:` para Faturamento Anterior no card ConsolidaçÁo)

## [094-fix-import-wipeout]
- CorreçÁo Crítica do Mecanismo de ImportaçÁo (Fim do Wipeout)
- Modificado: `src/hooks/useTransactions.ts` (Removido delete-and-insert do OFX e restringido o delete da Rede apenas aos sources de origem, protegendo lançamentos manuais)

## [095-fix-pix-match-text]
- RemoçÁo do Filtro Restritivo de Texto do PIX e RestauraçÁo do Faturamento Real
- Modificado: `src/hooks/useConciliacao.ts` (RemoçÁo da restriçÁo textual `includes('PIX')` no cruzamento matemático do Extrato)
- Modificado: `src/routes/conciliacao.index.tsx` (SubstituiçÁo do Faturamento Baseado em Texto por Faturamento de AmarraçÁo Real do Banco de Dados)

## [096-fix-math-rage]
- Alinhamento Matemático de "Planilha vs Banco" e Snapshots de Pátio
- Modificado: `src/components/importacoes/CentralImportWizard.tsx` (Adicionado Snapshot instantâneo do Pátio `na_loja_os` para blindagem de dados históricos)
- Modificado: `src/routes/conciliacao.index.tsx` (Alterado o Faturamento para ser puramente o saldo validado do extrato `saldo_banco_itau`, sem mistura com planilhas)
- Modificado: `src/lib/modulo1Calculations.ts` (RemoçÁo de ProvisÁo do fluxo de despesas pagas no dia)
- Modificado: `src/components/conciliacao/ResumoDiaPanel.tsx` (Ajustado `contasAPagarAutomatico` para capturar as saídas OFX em valor absoluto)

## [097-saldo-faturamento-fix]
- Nomenclatura UI e InversÁo de Diferença Contábil
- Modificado: `src/routes/conciliacao.index.tsx` (Renomeado os painéis de "Saldo" para "Faturam. Banco" e "Faturamento" para "Previsto". A conta de Diferença foi invertida para Faturamento Banco - Previsto, tornando as sobras positivas (verdes) e os furos negativos (vermelhos))

## [098-conciliacao-bugs-fix]
- Consertos na Matemática de Contas, ExtraçÁo de Pátio e InicializaçÁo de Fluxo
- Modificado: `src/lib/modulo1Calculations.ts` (AdiçÁo de `Math.abs` em despesas para evitar cálculos matemáticos invertidos com números negativos).
- Modificado: `src/hooks/useConciliacao.ts` (Regra de filtro tolerante para o status de OS pendente).
## [099-revert-manual-and-fix-patio]
- Escopo Rigoroso de Pátio e ReversÁo de AutomaçÁo de Caixa
- Modificado: `src/hooks/useConciliacao.ts` (RemoçÁo do vazamento de dados de snapshots passados. A foto do pátio agora é estritamente vinculada à data exata).
## [100-fix-ofx-cents-amounts]
- ProteçÁo de Parsing de Transações OFX em Centavos
- Modificado: `src/lib/parsers/ofxParser.ts` (ImplementaçÁo de varredura e divisÁo por 100 para extrações de `TRNAMT` que nÁo possuam separador decimal).

### 4.7 AutomaçÁo de ConciliaçÁo
- **ImportaçÁo Centralizada (CentralImportWizard.tsx)**: Arquivo base para entrada de dados em lote. Aciona automaticamente o pareamento das transações importadas no banco de dados, via uto_match_transactions, ao final do fluxo.
- **IdentificaçÁo de PIX**: O parser do Wizard avalia o 	itle das transações do OFX. Se contiver 'PIX', injeta a string pix na coluna payment_method para que o painel diário contabilize corretamente o fluxo.

- **2026-08-07 (118)**: ModificaçÁo na RPC get_dashboard_metrics para ignorar dias vazios no cálculo de fluxo de caixa e abranger saldos globais de OFX; ajustes no edeParser.ts para ler juros diretamente da matriz; ajustes no CentralImportWizard para salvar global_account.
