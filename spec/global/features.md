# Features e MÃƒÂ³dulos Existentes (Mapa Vivo Anti-DuplicaÃƒÂ§ÃƒÂ£o)

## ConciliaÃƒÂ§ÃƒÂ£o & Fechamento
- **Cards de Fechamento por Loja (`src/routes/conciliacao.index.tsx`):** Exibe 6 colunas por loja: Faturamento, Maquininha, PIX, Na Loja OS, Faturamento ItaÃƒÂº (OFX - Saldo Real) e DiferenÃƒÂ§a.
- **Resumo Financeiro Consolidado (`src/components/conciliacao/ResumoDiaPanel.tsx`):** Hero Card ÃƒÂºnico consolidando os saldos da rede, OFX e OSs.
- **Hook `useLatestBankBalance` (`src/hooks/useTransactions.ts`):** Retorna o ÃƒÂºltimo saldo real OFX (`bank_total`) por loja para evitar saldo zerado em dias sem importaÃƒÂ§ÃƒÂ£o nova.
- **Hook `useModulo1StoresData` (`src/hooks/useConciliacao.ts`):** Retorna o faturamento real (Maquininha + PIX Casado no banco), entradas de cartÃƒÂ£o, PIX vÃƒÂ¡lidos com match de OFX, e saldo em aberto real por loja na data.

## InteligÃƒÂªncia Artificial & Telemetria
- **Motor de ConciliaÃƒÂ§ÃƒÂ£o Headless (`src/hooks/useBackgroundAiReconciler.ts`):** Dispara automaticamente em background em busca de triplas associaÃƒÂ§ÃƒÂµes (OS / Maquininha / Banco).
- **Gerador de AssociaÃƒÂ§ÃƒÂµes (`src/lib/llm-matcher.ts`):** IntegraÃƒÂ§ÃƒÂ£o com Gemini, OpenAI e Claude. Grava logs em `public.ai_execution_logs`.
- **Painel de GestÃƒÂ£o & Telemetria (`src/routes/agente.tsx`):** Abas Chat, Provedores & API Keys, Telemetria & Custos (tokens e R$ BRL) e DevTools Inspector JSON com botÃƒÂ£o "Executar Teste de IA".
- **Tabela `public.ai_execution_logs`:** Registro imutÃƒÂ¡vel de chamadas, tokens, custo estimado, tempo de execuÃƒÂ§ÃƒÂ£o e payloads.
- **Tabela `public.ai_settings`:** ConfiguraÃƒÂ§ÃƒÂµes de provedor, modelo e chave de API por usuÃƒÂ¡rio ou `GLOBAL`.
- **ConciliaMec Bot (VPS / Traefik):** ServiÃƒÂ§o headless de coleta de relatÃƒÂ³rios via Playwright (Oficina Inteligente / Rede), exposto publicamente sob `bot.tork.services` via Cloudflare Tunnel.
- **API `GET /api/os/:id` (Bot VPS):** Endpoint para busca de OS em tempo real via AJAX UpdatePanel direto no sistema legado da Oficina, contornando bloqueios de scraping.
- **PromptInput Minimalista (`src/components/chat/PromptInput.tsx`):** Componente avanÃƒÂ§ado com animaÃƒÂ§ÃƒÂµes framer-motion e auto-resize.
- **MessageList (`src/components/chat/MessageList.tsx`):** Exibe execuÃƒÂ§ÃƒÂµes de MCP logs via um bloco expansÃƒÂ­vel `StepAccordion` minimalista com suporte a `aggregateAssistantTurns`.
- **Tool Edge Function (`supabase/functions/ai-chat/index.ts`):** Possui as ferramentas locais `consulta_resumo_os`, `consulta_saldo_contas`, `consulta_conciliacao_periodo`, `consulta_contas_em_aberto` e as externas `consulta_os_detalhe_completo`, `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`.
- **PersistÃƒÂªncia de Retaguarda:** Gravando no evento `onFinish` do `streamText` usando `supabaseAdmin` (`SERVICE_ROLE_KEY`) para garantir persistÃƒÂªncia no Supabase sem depender do cliente.
- **Workspace do Agente de IA (`src/routes/agente.tsx`):** Container SPA com navegaÃƒÂ§ÃƒÂ£o fluida em abas (Chat, ConfiguraÃƒÂ§ÃƒÂµes, Custos, Logs) gerenciada por `activeView`, sem reload de rotas globais.
- **PainÃƒÂ©is do Workspace (`src/components/agente/*`):** Componentes extraÃƒÂ­dos para modularizar a interface, incluindo `CustosPanel`, `ConfiguracoesPanel`, `LogsAgentePanel` e `LogsMotorPanel`.
- **Auto-TitulaÃƒÂ§ÃƒÂ£o do HistÃƒÂ³rico:** Em `src/routes/agente.tsx`, sistema de requisiÃƒÂ§ÃƒÂ£o assÃƒÂ­ncrona gerando "Smart Titles" em background para nÃƒÂ£o travar a UI de chat, incluindo limpeza imediata de histÃƒÂ³rico ao alternar conversas.
- **Regras de ProveniÃƒÂªncia & Isolamento (`supabase/functions/ai-chat/index.ts`):** InclusÃƒÂ£o da `<regra_proibiÃƒÂ§ÃƒÂ£o_alucinaÃƒÂ§ÃƒÂ£o_origem>` e isolamento estrito de histÃƒÂ³rico por `conversation_id` em `src/routes/agente.tsx`.

## Parsers e ImportaÃƒÂ§ÃƒÂ£o
- **NormalizaÃƒÂ§ÃƒÂ£o de Nomes de Loja (`src/lib/parsers/storeMapping.ts`):** DicionÃƒÂ¡rio utilitÃƒÂ¡rio que padroniza lojas inconsistentes (Maquininha/Juros) usando keys normalizadas em lowercase e mapeamento explÃƒÂ­cito, protegendo contra hard-ignores destrutivos.
- **IdempotÃƒÂªncia de Maquininha (`src/components/importacoes/CentralImportWizard.tsx`):** GeraÃƒÂ§ÃƒÂ£o de `fitid` sintÃƒÂ©tico determinÃƒÂ­stico (`source_store_date_amount_method`) para transaÃƒÂ§ÃƒÂµes Rede/Taxas/Maquininha, prevenindo duplicaÃƒÂ§ÃƒÂ£o em mÃƒÂºltiplas importaÃƒÂ§ÃƒÂµes do mesmo Excel via onConflict nativo.

- **[Backend] Edge Function sync-oficina**: Motor de sincronizaÃ§Ã£o que puxa listas de Contas a Pagar e OSs de forma assÃ­ncrona do bot.
- **[Backend] Tabelas de Cache de IA**: oficina_contas e oficina_os_cache. Essenciais para o funcionamento condicional (live vs cache) da ferramenta do Agente AI para evitar timeouts no Playwright.

- **[Frontend] Telemetria HÃ­brida**: PainÃ©is \LogsAgentePanel\ (lendo da tabela \mcp_logs\) e \CacheAgentePanel\ para inspecionar cache nativo das Ordens de ServiÃ§o diretamente pela UI do Agente.
- **[Backend] AutomaÃ§Ã£o Postgres Cron**: Migration com pg_cron e pg_net para acionar HTTP hooks em background.

## Dashboard Executivo (Fintech V5)
- **Hook Central de KPIs (`src/hooks/useDashboardV2.ts`):** Pivotado para ancorar datas e o faturamento base na tabela `import_logs` (jÃ¡ que a importaÃ§Ã£o parou de gravar `os_total` em `reconciliations`).
- **Data Augmentation:** Puxa e soma dados manuais globais (`daily_snapshots`) como *Dinheiro MP*, *Faturamento Outros* e *A Receber Manual*.
- **Contas via OFX:** Elimina o uso da API legada (`oficina_contas`) e extrai as "Contas (OFX)" filtrando `amount < 0` e `type = 'out'` diretamente da tabela `transactions` para aquele fechamento.
- **Tabela de Lojas (`src/components/dashboard/StoreTableDashboard.tsx`):** Exibe colunas de saldo, faturamento e a nova coluna `Contas (OFX)` por loja, usando dados extraÃ­dos do extrato bancÃ¡rio puro.
- **`KpiCard` GenÃ©rico (`src/components/dashboard/KpiCard.tsx`):** Componente base de UI para mÃ©tricas com animaÃ§Ãµes, formataÃ§Ã£o inteligente e tooltips.
- **Tabela de Lojas (`src/components/dashboard/StoreTableDashboard.tsx`):** VisÃ£o base do dashboard condensando status, saldo real, contas e pÃ¡tio por loja (com dados empilhados para nÃ£o espremer layout). Possui `<tfoot>` nativo para Totalizadores da rede.
- **Faturamento vs Contas Chart (`src/components/dashboard/FaturamentoVsContasChart.tsx`):** GrÃ¡fico de barras horizontal responsivo usando Recharts.
- **EvoluÃ§Ã£o do Saldo Global (`src/components/dashboard/EvolucaoSaldoChart.tsx`):** GrÃ¡fico de Ã¡rea preenchida (`AreaChart`) ilustrando o histÃ³rico do saldo total (bank_total) nos Ãºltimos 15 dias para leitura executiva da saÃºde financeira.
- **HistÃ³rico de TransaÃ§Ãµes por Loja (`src/routes/loja.$lojaId.tsx`):** Exibe a lista completa de transaÃ§Ãµes da loja (OFX e sistema) em um layout de tabela clÃ¡ssica e compacta (Data, Tipo, DescriÃ§Ã£o, Valor), em substituiÃ§Ã£o aos blocos de card.
- **Limite de Conta (OFX):** Extrai dinamicamente as tags `<OVERDRAFTLIMIT>` ou `<CREDITLIMIT>` no parser `ofxParser.ts` e atualiza `account_limit` da tabela `stores` automaticamente na importaÃ§Ã£o.

- **Automação Contábil OFX (Agosto 2026)**: 'Contas a Pagar' e 'Outros Faturamentos' são calculados dinamicamente via useConciliacaoResumo (	otalOfxOut e deduções de 	otalOfxIn vs 	otalPixOs) em ResumoDiaPanel.tsx. Não existem mais campos manuais para esses valores na Importação.

- **Herança de Pátio Pendente (Agosto 2026)**: A métrica 'Na Loja OS' no fechamento diário agora usa uma estratégia de carry-over (useModulo1StoresData), varrendo os últimos 30 dias para herdar a dívida legada caso não haja snapshot gravado para o dia corrente.

- **Refatoração Matemática Bruto/Líquido (Agosto 2026)**: A conciliação distingue Venda Bruta (OS e Maquininha na data) de Pagamento Líquido (OFX na data de liquidação). O parser da Rede salva `gross_amount` e `fee_amount` na tabela `transactions`, e a UI `ResumoDiaPanel.tsx` exibe as "Taxas/Juros" subtraídas dinamicamente para evitar falsas divergências.

- **Deduplicação de OFX Ignorando Conflitos (Agosto 2026)**: O hook `useBulkInsertTransactions` utiliza o método de Upsert nativo com `ignoreDuplicates: true` para ignorar silenciosamente transações OFX de outros dias presentes no lote corrente, evitando o erro de constraint `transactions_store_fitid_key`.
  
- **M�dulo**: Logger (Trace Log Json) (src/lib/logger.ts) - Implementado na Spec 101 

- **Advanced Trace Logging (Spec 102)**: Propaga��o de sessionId pelo useCentralImport.ts e emiss�o de array JSON completo para cada parser (ofxParser, redeParser, useOsImportProcessor, maquininha) para viabilizar debug 100% acurado no DevTools.
# #   D e v   A u t o - I m p o r t   ( F e a t u r e   1 0 5 ) 
 -   * * S c r i p t * * :   s c r i p t s / g e n e r a t e - m o c k s . m j s   ( C o n v e r t e   e x t r a t o s   e m   B a s e 6 4   p a r a   b y p a s s a r   s e g u r a n a   d o   n a v e g a d o r   v i a   V i t e ) . 
 -   * * M a p e a m e n t o   d e   L o j a s   ( R e s i l i n c i a ) * * :   u s e U n i f i e d S t o r e M a p p i n g   s a l v a   o   s l u g   n o r m a l i z a d o   d a   l o j a   n o   l o c a l S t o r a g e   e m   v e z   d o   U U I D   q u e b r a d o ,   r e c a r r e g a n d o   a u t o m a t i c a m e n t e   a p s   r e s e t a r   o   b a n c o .  
 - **[Backend] Performance Fixes (Specs 112-114):** A RPC `calculate_daily_conciliation` agora processa toda a matemática consolidada da Dashboard diretamente no PostgreSQL. Protegida contra falhas de digitação e schema (removido parsed_pix_transfer e payment_methods).
-   * * [ B a c k e n d   e   F r o n t e n d ]   F l u x o   d e   C a i x a   e   V a l o r   C o n t a s   ( S p e c   1 4 1 ) : * *   C o r r e c a o   d a   m a t e m a t i c a   n o   g e t _ d a s h b o a r d _ m e t r i c s   p a r a   u s a r   C a i x a   A t u a l   -   C a i x a   A n t e r i o r ,   e   n o v o   h o o k   u s e G l o b a l O f x O u t   n o   R e a c t   p a r a   g a r a n t i r   a   i n c l u s a o   d e   s a i d a s   O F X   n o   s o m a t o r i o   g l o b a l   d e   d e s p e s a s .  
   
- [146] [2026-08-07] Restaura��o de import_logs, tipagem de get_store_financial_stats para text, e view transactions baseada em target_date 
- **Feature 147 (Conciliacao):** Navegacao estrita de datas (bloqueio de dias vazios) usando o novo hook useAvailableConciliacaoDates (src/hooks/useDailySnapshot.ts). 

- **ImportSourceBadges (149-conciliation-details)**: Modal de raio-x de lotes na concilia��o que exibe RawOsTable, RawRedeTable e RawOfxTable (src/components/conciliacao/)
- **useRawImportData (149-conciliation-details)**: Hook para buscar dados limpos vindos das novas RPCs get_raw_os_data, get_raw_rede_data, get_raw_ofx_data (src/hooks/)
- **get_raw_os_data(text, date) (150-fix)**: RPC corrigida � p_store_id agora text, filtro por opened_at::date
- **get_raw_rede_data(text, date) (150-fix)**: RPC corrigida � p_store_id text, filtro target_date, novos campos machine_name/payment_method/occurred_at
- **get_raw_ofx_data(text, date) (150-fix)**: RPC corrigida � p_store_id text, filtro target_date, cast p_store_id::uuid para stores.id
  
### Marco Zero Global e Auditoria (11/08/2026)  
- **MarcoZeroWizard.tsx**: Modificado para parsear todas as abas dinamicamente da planilha e renderizar cards de visualiza��o para cada uma, suportando multiplas inser��es.  
- **AuditoriaPassivoWizard.tsx**: Novo wizard estilo checklist para aprova��o/baixa manual das OSs que est�o em estoque_os_pendente com status PENDENTE. Foi inserido em CentralImportWizard (passo 2.5).  
- **marcoZeroParser.ts**: Modificado para extrair MarcoZeroExtraction[] iterando sobre todas as SheetNames do workbook xlsx. 
  
- **LegacyOsTable** (src/components/conciliacao/LegacyOsTable.tsx): Tabela dedicada para gest�o e liquida��o em lote de OSs legadas do Marco Zero.  
- **liquidate_legacy_os** (Supabase RPC): Baixa at�mica de OSs legadas alterando status para pago e integrando com o contador de pend�ncias na loja. 
- **roundCurrency** (src/lib/parsers/numberUtils.ts): Utilit�rio central de alta precis�o (Math.round((val + Number.EPSILON) * 100) / 100) para sanitizar IEEE 754. 

- **Desacoplamento Marco Zero e Correção Na Loja OS (195):** RPCs `get_dashboard_metrics` e `calculate_daily_conciliation` refatoradas na migration `20260814000000_decouple_marco_zero.sql` para isolar a métrica "Na Loja OS" de `estoque_os_pendente`, garantindo que o card reflita 100% o pátio diário real e zere ao acionar o botão de limpeza.