# Features e MÃ³dulos Existentes (Mapa Vivo Anti-DuplicaÃ§Ã£o)

## ConciliaÃ§Ã£o & Fechamento
- **Cards de Fechamento por Loja (`src/routes/conciliacao.index.tsx`):** Exibe 6 colunas por loja: Faturamento, Maquininha, PIX, Na Loja OS, Faturamento ItaÃº (OFX - Saldo Real) e DiferenÃ§a.
- **Resumo Financeiro Consolidado (`src/components/conciliacao/ResumoDiaPanel.tsx`):** Hero Card Ãºnico consolidando os saldos da rede, OFX e OSs.
- **Hook `useLatestBankBalance` (`src/hooks/useTransactions.ts`):** Retorna o Ãºltimo saldo real OFX (`bank_total`) por loja para evitar saldo zerado em dias sem importaÃ§Ã£o nova.
- **Hook `useModulo1StoresData` (`src/hooks/useConciliacao.ts`):** Retorna o faturamento real (Maquininha + PIX Casado no banco), entradas de cartÃ£o, PIX vÃ¡lidos com match de OFX, e saldo em aberto real por loja na data.

## InteligÃªncia Artificial & Telemetria
- **Motor de ConciliaÃ§Ã£o Headless (`src/hooks/useBackgroundAiReconciler.ts`):** Dispara automaticamente em background em busca de triplas associaÃ§Ãµes (OS / Maquininha / Banco).
- **Gerador de AssociaÃ§Ãµes (`src/lib/llm-matcher.ts`):** IntegraÃ§Ã£o com Gemini, OpenAI e Claude. Grava logs em `public.ai_execution_logs`.
- **Painel de GestÃ£o & Telemetria (`src/routes/agente.tsx`):** Abas Chat, Provedores & API Keys, Telemetria & Custos (tokens e R$ BRL) e DevTools Inspector JSON com botÃ£o "Executar Teste de IA".
- **Tabela `public.ai_execution_logs`:** Registro imutÃ¡vel de chamadas, tokens, custo estimado, tempo de execuÃ§Ã£o e payloads.
- **Tabela `public.ai_settings`:** ConfiguraÃ§Ãµes de provedor, modelo e chave de API por usuÃ¡rio ou `GLOBAL`.
- **ConciliaMec Bot (VPS / Traefik):** ServiÃ§o headless de coleta de relatÃ³rios via Playwright (Oficina Inteligente / Rede), exposto publicamente sob `bot.tork.services` via Cloudflare Tunnel.
- **API `GET /api/os/:id` (Bot VPS):** Endpoint para busca de OS em tempo real via AJAX UpdatePanel direto no sistema legado da Oficina, contornando bloqueios de scraping.
- **PromptInput Minimalista (`src/components/chat/PromptInput.tsx`):** Componente avanÃ§ado com animaÃ§Ãµes framer-motion e auto-resize.
- **MessageList (`src/components/chat/MessageList.tsx`):** Exibe execuÃ§Ãµes de MCP logs via um bloco expansÃ­vel `StepAccordion` minimalista com suporte a `aggregateAssistantTurns`.
- **Tool Edge Function (`supabase/functions/ai-chat/index.ts`):** Possui as ferramentas locais `consulta_resumo_os`, `consulta_saldo_contas`, `consulta_conciliacao_periodo`, `consulta_contas_em_aberto` e as externas `consulta_os_detalhe_completo`, `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`.
- **PersistÃªncia de Retaguarda:** Gravando no evento `onFinish` do `streamText` usando `supabaseAdmin` (`SERVICE_ROLE_KEY`) para garantir persistÃªncia no Supabase sem depender do cliente.
- **Workspace do Agente de IA (`src/routes/agente.tsx`):** Container SPA com navegaÃ§Ã£o fluida em abas (Chat, ConfiguraÃ§Ãµes, Custos, Logs) gerenciada por `activeView`, sem reload de rotas globais.
- **PainÃ©is do Workspace (`src/components/agente/*`):** Componentes extraÃ­dos para modularizar a interface, incluindo `CustosPanel`, `ConfiguracoesPanel`, `LogsAgentePanel` e `LogsMotorPanel`.
- **Auto-TitulaÃ§Ã£o do HistÃ³rico:** Em `src/routes/agente.tsx`, sistema de requisiÃ§Ã£o assÃ­ncrona gerando "Smart Titles" em background para nÃ£o travar a UI de chat, incluindo limpeza imediata de histÃ³rico ao alternar conversas.
- **Regras de ProveniÃªncia & Isolamento (`supabase/functions/ai-chat/index.ts`):** InclusÃ£o da `<regra_proibiÃ§Ã£o_alucinaÃ§Ã£o_origem>` e isolamento estrito de histÃ³rico por `conversation_id` em `src/routes/agente.tsx`.

## Parsers e ImportaÃ§Ã£o
- **NormalizaÃ§Ã£o de Nomes de Loja (`src/lib/parsers/storeMapping.ts`):** DicionÃ¡rio utilitÃ¡rio que padroniza lojas inconsistentes (Maquininha/Juros) usando keys normalizadas em lowercase e mapeamento explÃ­cito, protegendo contra hard-ignores destrutivos.
- **IdempotÃªncia de Maquininha (`src/components/importacoes/CentralImportWizard.tsx`):** GeraÃ§Ã£o de `fitid` sintÃ©tico determinÃ­stico (`source_store_date_amount_method`) para transaÃ§Ãµes Rede/Taxas/Maquininha, prevenindo duplicaÃ§Ã£o em mÃºltiplas importaÃ§Ãµes do mesmo Excel via onConflict nativo.

- **[Backend] Edge Function sync-oficina**: Motor de sincronização que puxa listas de Contas a Pagar e OSs de forma assíncrona do bot.
- **[Backend] Tabelas de Cache de IA**: oficina_contas e oficina_os_cache. Essenciais para o funcionamento condicional (live vs cache) da ferramenta do Agente AI para evitar timeouts no Playwright.

- **[Frontend] Telemetria Híbrida**: Painéis \LogsAgentePanel\ (lendo da tabela \mcp_logs\) e \CacheAgentePanel\ para inspecionar cache nativo das Ordens de Serviço diretamente pela UI do Agente.
- **[Backend] Automação Postgres Cron**: Migration com pg_cron e pg_net para acionar HTTP hooks em background.

## Dashboard Executivo (Fintech V5)
- **Hook Central de KPIs (`src/hooks/useDashboardV2.ts`):** Pivotado para ancorar datas e o faturamento base na tabela `import_logs` (já que a importação parou de gravar `os_total` em `reconciliations`).
- **Data Augmentation:** Puxa e soma dados manuais globais (`daily_snapshots`) como *Dinheiro MP*, *Faturamento Outros* e *A Receber Manual*.
- **Contas via OFX:** Elimina o uso da API legada (`oficina_contas`) e extrai as "Contas (OFX)" filtrando `amount < 0` e `type = 'out'` diretamente da tabela `transactions` para aquele fechamento.
- **Tabela de Lojas (`src/components/dashboard/StoreTableDashboard.tsx`):** Exibe colunas de saldo, faturamento e a nova coluna `Contas (OFX)` por loja, usando dados extraídos do extrato bancário puro.
- **`KpiCard` Genérico (`src/components/dashboard/KpiCard.tsx`):** Componente base de UI para métricas com animações, formatação inteligente e tooltips.
- **Tabela de Lojas (`src/components/dashboard/StoreTableDashboard.tsx`):** Visão base do dashboard condensando status, saldo real, contas e pátio por loja (com dados empilhados para não espremer layout). Possui `<tfoot>` nativo para Totalizadores da rede.
- **Faturamento vs Contas Chart (`src/components/dashboard/FaturamentoVsContasChart.tsx`):** Gráfico de barras horizontal responsivo usando Recharts.
- **Evolução do Saldo Global (`src/components/dashboard/EvolucaoSaldoChart.tsx`):** Gráfico de área preenchida (`AreaChart`) ilustrando o histórico do saldo total (bank_total) nos últimos 15 dias para leitura executiva da saúde financeira.
- **Histórico de Transações por Loja (`src/routes/loja.$lojaId.tsx`):** Exibe a lista completa de transações da loja (OFX e sistema) em um layout de tabela clássica e compacta (Data, Tipo, Descrição, Valor), em substituição aos blocos de card.
- **Limite de Conta (OFX):** Extrai dinamicamente as tags `<OVERDRAFTLIMIT>` ou `<CREDITLIMIT>` no parser `ofxParser.ts` e atualiza `account_limit` da tabela `stores` automaticamente na importação.

- **Automa��o Cont�bil OFX (Agosto 2026)**: 'Contas a Pagar' e 'Outros Faturamentos' s�o calculados dinamicamente via useConciliacaoResumo (	otalOfxOut e dedu��es de 	otalOfxIn vs 	otalPixOs) em ResumoDiaPanel.tsx. N�o existem mais campos manuais para esses valores na Importa��o.
