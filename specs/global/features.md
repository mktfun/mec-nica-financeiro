# Features
### Frontend

- `src/routes/custos.tsx`: Nova tela de monitoramento de custos com I.A., exibindo painel com métricas de requisições de Chat e Motor filtráveis por período (Hoje, Esta Semana, Este Mês).
- `src/routes/agente.tsx`: Interface de chat principal, agora com paginação no histórico, UI livre de overlaps no layout principal, e auto-titulação.
- `src/routes/logs.agente.tsx`: Monitoramento e telemetria, com botão de navegação nativa.
- `src/routes/logs.motor.tsx`: Refatorado com estilo de Acordeão (`<details>`) para payloads estruturados de Input/Output do Motor, e botão de navegação nativa.

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

## [097-saldo-faturamento-fix]
- Nomenclatura UI e Inversão de Diferença Contábil
- Modificado: `src/routes/conciliacao.index.tsx` (Renomeado os painéis de "Saldo" para "Faturam. Banco" e "Faturamento" para "Previsto". A conta de Diferença foi invertida para Faturamento Banco - Previsto, tornando as sobras positivas (verdes) e os furos negativos (vermelhos))

## [098-conciliacao-bugs-fix]
- Consertos na Matemática de Contas, Extração de Pátio e Inicialização de Fluxo
- Modificado: `src/lib/modulo1Calculations.ts` (Adição de `Math.abs` em despesas para evitar cálculos matemáticos invertidos com números negativos).
- Modificado: `src/hooks/useConciliacao.ts` (Regra de filtro tolerante para o status de OS pendente).
## [099-revert-manual-and-fix-patio]
- Escopo Rigoroso de Pátio e Reversão de Automação de Caixa
- Modificado: `src/hooks/useConciliacao.ts` (Remoção do vazamento de dados de snapshots passados. A foto do pátio agora é estritamente vinculada à data exata).
## [100-fix-ofx-cents-amounts]
- Proteção de Parsing de Transações OFX em Centavos
- Modificado: `src/lib/parsers/ofxParser.ts` (Implementação de varredura e divisão por 100 para extrações de `TRNAMT` que não possuam separador decimal).

### 4.7 Automação de Conciliação
- **Importação Centralizada (CentralImportWizard.tsx)**: Arquivo base para entrada de dados em lote. Aciona automaticamente o pareamento das transações importadas no banco de dados, via uto_match_transactions, ao final do fluxo.
- **Identificação de PIX**: O parser do Wizard avalia o 	itle das transações do OFX. Se contiver 'PIX', injeta a string pix na coluna payment_method para que o painel diário contabilize corretamente o fluxo.

- **2026-08-07 (118)**: Modificação na RPC get_dashboard_metrics para ignorar dias vazios no cálculo de fluxo de caixa e abranger saldos globais de OFX; ajustes no edeParser.ts para ler juros diretamente da matriz; ajustes no CentralImportWizard para salvar global_account.

## [ofx-expenses]
- **Deduplicação e Salvamento de Despesas do OFX**: 
  - Ajuste no useTransactions.ts e CentralImportWizard.tsx para não dropar despesas que vêm do banco sem o campo FITID. Em caso de ausência do ID no arquivo bancário, um hash determinístico (data+valor+título) é injetado.
  - O mapeamento nativo de matched_store_id (via conta bancária) agora é plenamente mantido para as despesas (out), vinculando-as corretamente às respectivas lojas para contabilização de saldo descentralizada.
# #   [ i m p o r t - d e d u p - u p g r a d e ] 
 -   * * D e d u p l i c a � � o   G l o b a l   d e   I m p o r t a � � e s * * : 
     -   T a b e l a   ` p o s _ t r a n s a c t i o n s `   a t u a l i z a d a   p a r a   p o s s u i r   a   c o l u n a   ` d e d u p _ h a s h `   c o m   c o n s t r a i n t   ` U N I Q U E ` . 
     -   F r o n t e n d   u s a   ` g e n e r a t e D e t e r m i n i s t i c H a s h `   ( n o v o   e m   ` h a s h U t i l s . t s ` )   p a r a   i n j e t a r   i d e n t i d a d e s   d e t e r m i n � s t i c a s   b a s e a d a s   e m   ( d a t a + v a l o r + t � t u l o )   n o   p a r s e r   O F X ,   p l a n i l h a s   d e   M a q u i n i n h a   e   R e d e ,   i g n o r a n d o   o   p r o b l e m � t i c o   ` < F I T I D > ` . 
     -   M u d a n � a   m a s s i v a   n o s   p i p e l i n e s   d o   b a c k e n d   q u e   a b a n d o n a r a m   ` i n s e r t `   f r � g i l   p a r a   u t i l i z a r   ` u p s e r t `   i n q u e b r � v e l ,   b l i n d a n d o   o   b a n c o   d e   d a d o s   c o n t r a   r e p e t i � � e s   d e   u p l o a d   d a s   m e s m a s   p l a n i l h a s .  
 
## [155-historical-os-query]
- **Acúmulo Histórico de Pátio OS**: 
  - As RPCs `get_conciliation_breakdown` e `calculate_daily_conciliation` foram atualizadas na migration `20260810190000_historical_patio_os.sql` para filtrar OS usando `opened_at::date <= p_date` e saldo devedor remanescente, puxando dívidas antigas para a conciliação atual.
  - Remoção de anti-patterns de cast de datas no SQL que causavam erro `operator does not exist: date = text`.
