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

## [156-fix-breakdown-type]
- **Bugfix na UI de Conciliação (Raio X)**: Atualização do componente `BreakdownModal.tsx` e da interface `ConciliationBreakdown` no hook `useConciliationBreakdown.ts` para corresponder à estrutura de tipagem aninhada (`total` e `transactions`) que a Spec 155 havia modificado silenciosamente no Supabase. O erro de map foi sanado.

## [157-sync-oficina-button]
- **Botão Sincronizar Oficina Agora**: Agora funcional na UI de Central de Importações. Dispara as rotinas de sincronização na VPS via Edge Function `sync-oficina` de forma paralela para todas as lojas.

## [158-cors-edge-function]
- **Fix Edge Function CORS**: Adição da constante `corsHeaders` oficial na função `sync-oficina` para suportar requisições OPTIONS originadas pelo client do Supabase (Browser).

## [159-sync-feedback-fix]
- **Feedback UI (Toast)**: Adição de Toasts Sonner verdes no disparo do bot Cloud no Wizard.

## [160-sync-date-picker]
- **Seletor de Datas Cloud**: Parâmetro `data` (targetDate) enviado no invoke da edge function para filtrar raspagens do bot PM2 retroativamente.

## [161-cloud-sync-live-preview]
- **Agent UI Runner**: Componente `AgentRunnerModal` e `AgentStageItem` que criam a experiência de terminal de bot expansível com Framer Motion. 
- **Auto-Injection (Polling)**: O Frontend faz polling de `oficina_contas` e injeta automaticamente os dados no Step 3 do Wizard após a Edge Function ser processada, substituindo a UX cega do sistema anterior.
  
### Feature 164: O Fim do Robô e Conciliação Híbrida  
- Nova tabela Supabase: estoque_os_pendente  
- Novo parser: src/lib/parsers/marcoZeroParser.ts (lê saldo e OS da planilha legada)  
- Novo componente React: src/components/importacoes/MarcoZeroWizard.tsx  
- Novo componente React: src/components/importacoes/MatchManualOsPendente.tsx (Passo 3.5 do Wizard)  
- Refatoração do useConciliacao.ts para usar estoque_os_pendente em vez de patio_os 
  
- **[168] Refatoracao do Marco Zero (2026-08-12):** Nova estrutura no marcoZeroParser.ts para separar extracao global de OSs locais. MarcoZeroWizard.tsx passou a exigir 'Data da Implantacao' e agora insere retroativamente os totais do saldo inicial na tabela daily_snapshots. O botao de Marco Zero na tela central foi condicionado a ausencia de snapshots na base. 
## [169-marco-zero-globals]
- **Extração Expandida do Marco Zero Global**: O parser e a UI foram refatorados para extrair 15+ variáveis financeiras (Faturamento, Juros, Prolabore, Diferença, etc).
- **Modificado**: `src/lib/parsers/marcoZeroParser.ts` (Implementado um varredor de linhas para fuzzy-matching de rótulos em qualquer coluna).
- **Modificado**: `src/components/importacoes/MarcoZeroWizard.tsx` (Dashboard 3x4 Expandido com 15 variáveis; inserção destas variáveis na nova coluna `metadata`).
- **Modificado (Banco de Dados)**: Migration `20260812100300_add_metadata_to_daily_snapshots.sql` (Adicionado `metadata JSONB` à tabela `daily_snapshots`).
  
## [171-os-mixed-cell-parser]  
- **Parser Misto Resiliente (XLSX)**:  
  - Modificado: src/hooks/useOsImportProcessor.ts (Substitu�do parse num�rico fr�gil por extra��o avan�ada com Regex extractNumber de numberUtils.ts).  
  - Modificado: src/hooks/useImportProcessor.ts (Corrigidas tipagens omissas de ParsedOS e ParsedReceivable).  
  - As formas de pagamento e valores lidos da planilha de OS agora resistem a c�lulas preenchidas de forma mista por usu�rios humanos (ex: \" PIX R$ 1.5,"00\ no campo de valor).  
 

## Feature 172: Refatoração de UI/UX do Wizard e JSON Trail
- **Componentes Alterados:** `CentralImportWizard` (Dropzone unificado visualmente sem abrir janela paralela, design modernizado, botão de download JSON e console de log visual animado embutido), `AgentRunnerModal` (adaptado apenas para fluxos em nuvem reais).
- **Tipos/Hooks Adicionados:** Adicionado state mapping para `AgentStageItem` e Blob payload generator para `auditTrailUrl`.
  
## [171-os-mixed-cell-parser]  
- **Parser Misto Resiliente (XLSX)**:  
  - Modificado: src/hooks/useOsImportProcessor.ts (Substitudo parse numrico frgil por extrao avanada com Regex extractNumber de numberUtils.ts).  
  - Modificado: src/hooks/useImportProcessor.ts (Corrigidas tipagens omissas de ParsedOS e ParsedReceivable).  
  - As formas de pagamento e valores lidos da planilha de OS agora resistem a clulas preenchidas de forma mista por usurios humanos (ex: \" PIX R$ 1.5,"00\ no campo de valor).  
 

## Feature 172: Refatoração de UI/UX do Wizard e JSON Trail
- **Componentes Alterados:** `CentralImportWizard` (Dropzone unificado visualmente sem abrir janela paralela, design modernizado, botão de download JSON e console de log visual animado embutido), `AgentRunnerModal` (adaptado apenas para fluxos em nuvem reais).
- **Tipos/Hooks Adicionados:** Adicionado state mapping para `AgentStageItem` e Blob payload generator para `auditTrailUrl`.


## Feature 173: Fix PDF.js SSR Crash no Vite
- **Arquivo Modificado:** `src/lib/parsers/mapaMetasParser.ts`
- **Mudanca:** Import estatico `import * as pdfjsLib from 'pdfjs-dist'` removido do escopo global. Substituido por Dynamic Import (`await import('pdfjs-dist')`) dentro da funcao `parseMapaMetasPDF`.
- **Efeito:** Elimina crash SSR `DOMMatrix is not defined` ao carregar telas de Dashboard e Importacao.
- (174) Redesign Central Import Wizard: Refatorado Step 4 do Wizard para substituir o importLogs por AgentStageItem, refinando o aspecto premium e ocultando logs tcnicos atrs de export JSON. 

## [178-auditoria-virada-mes]
- **Auditoria de Estoque de OS Pendente**: Criado componente `AuditoriaPassivoWizard` para gerenciar a validação de OS do Marco Zero cruzando com o Excel importado do mês atual, impedindo duplo input.

## [179-fix-dashboard-math]
- **Correção da Matemática Financeira (Conciliação Diária Global)**: Refeita a equação de Diferença e Fluxo de Caixa no backend (RPC `get_dashboard_metrics`) e frontend (`modulo1Calculations.ts`) para garantir o cálculo puramente baseado nas premissas contábeis corretas, removendo deduções fantasmas.

## [186-refatoracao-marco-zero]
- **Refatoração Absoluta do Marco Zero (Backend Transacional + Log JSON + UI Dedicada)**:
  - **RPC SQL:** `supabase/migrations/20260813113000_process_marco_zero_rpc.sql` (RPC atômica idempotente `process_marco_zero_import` com tenant isolation por `store_id`).
  - **Wizard & Download Logs:** `MarcoZeroWizard.tsx` chama a RPC PostgreSQL atômica, exibe a tela de sucesso e disponibiliza o botão "Baixar Logs de Execução (.JSON)".
  - **UI Dedicada de Estado Inicial:** `ResumoDiaPanel.tsx` detecta `metadata.is_marco_zero === true` e renderiza a UI simplificada de Estado Inicial do Marco Zero sem a complexidade dos blocos de conciliação bancária padrão.
  
### 2026-08-13: Refatoracao CTEs Conciliacao (189)  
- **Status:** Implementado  
- **Modulos:** Backend RPC  
- **Supabase RPC:** calculate_daily_conciliation(p_date date) - Reescrita completa sem cursores iterativos (Early Aggregation com CTEs).  
- **Supabase RPC:** get_dashboard_metrics(p_date date) - Reescrita completa com isolamento CTE para aniquilar cartesian products. 

### 2026-08-13: Fix de Valores Inflados no OFX e OS (190)
- **Status:** Implementado
- **Modulos:** OFX Parser, Backend RPC
- **src/lib/parsers/ofxParser.ts:** Adicionada logica para dividir por 100 valores grandes em centavos exportados sem pontuacao.
- **Supabase RPCs:** calculate_daily_conciliation e get_dashboard_metrics passaram a excluir OSs com status finalizado do calculo pendente.

### 2026-08-13: Correcao Diferenca Final e Expurgo Provisao (191)
- **Status:** Implementado
- **Modulos:** Conciliacao, Frontend
- **modulo1Calculations.ts:** Diferenca calculada usando ABS no valor disp contas.
- **ResumoDiaPanel.tsx:** Rotulo Subtotal Valor Contas ajustado removendo Provisao.

### 2026-08-13: Correcao da Diferenca Final e Expurgo da Provisao (191)
- **Status:** Implementado
- **Modulos:** Conciliacao, Frontend
- **src/lib/modulo1Calculations.ts:** Corrigida a equacao de fechamento diario para usar valor absoluto no fundo disponivel, impedindo a subtracao de valores negativos que dobrava os debitos.
- **src/components/conciliacao/ResumoDiaPanel.tsx:** Rotulos visuais atualizados removendo referencias obsoletas a Provisao, restando apenas Juros e Contas Manuais.

### 2026-08-13: Protecao de Precisao OFX Jabaquara/Kennedy (192)
- **Status:** Implementado
- **Modulos:** Importacao (OFX), Conciliacao
- **src/lib/parsers/ofxParser.ts:** Trocada logica de extractNumber por parseFloat estrito na extracao do Saldo Bancario, impedindo que dízimas com apenas 1 dígito sejam corrompidas.
- **src/routes/conciliacao.index.tsx:** Ajuste visual na tabela de fechamento de lojas para Saldo Banco Itaú, evitando erros semanticos de interpretacao.

### 2026-08-13: Recalibração do Saldo Global itaú (<Feature ID>: 193)
- **Status:** Implementado
- **Módulos:** Conciliação, Dashboard
- **supabase/migrations/20260813160000_fix_global_reconciliation_sum_and_reset.sql:** Ajustou a RPC `get_dashboard_metrics` para extrair o saldo global puramente da leitura somada de `bank_total` das lojas na tabela `reconciliations`, e preservou os inputs manuais de Dinheiro MP. Executou cleanup dos snapshots corrompidos do dia 11/08.

### 2026-08-13: Restauração do Parser OFX (100x) e Correção Matemática (<Feature ID>: 194)
- **Status:** Implementado
- **Módulos:** Conciliação, OFX Parser, Cálculos
- **src/lib/parsers/ofxParser.ts:** Ajustou-se a extração de `TRNAMT`, `OVERDRAFTLIMIT`, etc. para usar `parseFloat(` nativo, prevenindo truncamento de dízimas de um dígito como `.9` ou `.5` que alteravam a grandeza do saldo (ex: 39.851,90 entrando como 3.985,19).
- **src/lib/modulo1Calculations.ts:** Ajustou-se a formula de diferença para confrontar magnitude absoluta do disponível contra contas `Yabs(X) - Y`, evitando acumulaação de sinais negativos (ex: -195k).

### 2026-08-13: Prote��o Extrema de Precis�o OFX Ita� (195)
- **Status:** Implementado
- **M�dulos:** Importa��o (OFX), Concilia��o
- **src/lib/parsers/ofxParser.ts:** Implementada triangula��o matem�tica para deduzir a grandeza correta de saldos truncados do Ita� (sem ponto e sem trailing zeros) cruzando o previousBalance + sum(TRNAMT). Resolve infla��o de saldos globais para 6.5M.


- **Desacoplamento Marco Zero e Correção Na Loja OS (195):** RPCs `get_dashboard_metrics` e `calculate_daily_conciliation` refatoradas na migration `20260814000000_decouple_marco_zero.sql` para isolar a métrica "Na Loja OS" de `estoque_os_pendente`, garantindo que o card reflita 100% o pátio diário real e zere ao acionar o botão de limpeza.
### Spec 196: Backend Daily Reconciliation Summary & Math Delegation
- **Status:** Completed
- **Data:** 2026-08-14
- **RPC:** `get_daily_reconciliation_summary(p_date date)` em `supabase/migrations/20260814010000_get_daily_reconciliation_summary.sql`
- **Hook:** `useDailyReconciliationSummary(date)` em `src/hooks/useBackendConciliacao.ts`
- **Impacto:** Eliminação total de loops `.reduce()` e queries pesadas no client da tela de conciliação diária; consolidação atômica de saldos bancários das 10 lojas, entradas e saídas OFX, taxas REDE e cálculo exato de fluxo de caixa e faturamento líquido.

- **Faturamento Odômetro, Trava de Edição & Faxina Visual (Spec 197):**
  - **Localização:** `src/lib/modulo1Calculations.ts`, `src/components/conciliacao/ResumoDiaPanel.tsx`, `src/components/importacoes/CentralImportWizard.tsx`.
  - **Regra:** Cálculo de faturamento líquido incremental tipo odômetro (`Hoje - Ant`) persistindo a leitura acumulada em `daily_snapshots.faturamento`.
  - **UI/UX:** Trava de formulário em modo leitura por padrão (`isEditing`) com botões 'Editar Fechamento', 'Salvar Alterações' e 'Cancelar'. Modal de importação com remoção de steppers redundantes e logs recolhidos em accordion monospaced.
