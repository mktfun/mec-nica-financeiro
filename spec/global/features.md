# Features e Módulos Existentes (Mapa Vivo Anti-Duplicação)

## Conciliação & Fechamento
- **Cards de Fechamento por Loja (`src/routes/conciliacao.index.tsx`):** Exibe 6 colunas por loja: Faturamento, Maquininha, PIX, Na Loja OS, Faturamento Itaú (OFX - Saldo Real) e Diferença.
- **Resumo Financeiro Consolidado (`src/components/conciliacao/ResumoDiaPanel.tsx`):** Hero Card único consolidando os saldos da rede, OFX e OSs.
- **Hook `useLatestBankBalance` (`src/hooks/useTransactions.ts`):** Retorna o último saldo real OFX (`bank_total`) por loja para evitar saldo zerado em dias sem importação nova.
- **Hook `useModulo1StoresData` (`src/hooks/useConciliacao.ts`):** Retorna o faturamento real (Maquininha + PIX Casado no banco), entradas de cartão, PIX válidos com match de OFX, e saldo em aberto real por loja na data.

## Inteligência Artificial & Telemetria
- **Motor de Conciliação Headless (`src/hooks/useBackgroundAiReconciler.ts`):** Dispara automaticamente em background em busca de triplas associações (OS / Maquininha / Banco).
- **Gerador de Associações (`src/lib/llm-matcher.ts`):** Integração com Gemini, OpenAI e Claude. Grava logs em `public.ai_execution_logs`.
- **Painel de Gestão & Telemetria (`src/routes/agente.tsx`):** Abas Chat, Provedores & API Keys, Telemetria & Custos (tokens e R$ BRL) e DevTools Inspector JSON com botão "Executar Teste de IA".
- **Tabela `public.ai_execution_logs`:** Registro imutável de chamadas, tokens, custo estimado, tempo de execução e payloads.
- **Tabela `public.ai_settings`:** Configurações de provedor, modelo e chave de API por usuário ou `GLOBAL`.
- **ConciliaMec Bot (VPS / Traefik):** Serviço headless de coleta de relatórios via Playwright (Oficina Inteligente / Rede), exposto publicamente sob `bot.tork.services` via Cloudflare Tunnel.
- **API `GET /api/os/:id` (Bot VPS):** Endpoint para busca de OS em tempo real via AJAX UpdatePanel direto no sistema legado da Oficina, contornando bloqueios de scraping.
- **PromptInput Minimalista (`src/components/chat/PromptInput.tsx`):** Componente avançado com animações framer-motion e auto-resize.
- **MessageList (`src/components/chat/MessageList.tsx`):** Exibe execuções de MCP logs via um bloco expansível `StepAccordion` minimalista com suporte a `aggregateAssistantTurns`.
- **Tool Edge Function (`supabase/functions/ai-chat/index.ts`):** Possui as ferramentas locais `consulta_resumo_os`, `consulta_saldo_contas`, `consulta_conciliacao_periodo`, `consulta_contas_em_aberto` e as externas `consulta_os_detalhe_completo`, `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`.
- **Persistência de Retaguarda:** Gravando no evento `onFinish` do `streamText` usando `supabaseAdmin` (`SERVICE_ROLE_KEY`) para garantir persistência no Supabase sem depender do cliente.
- **Workspace do Agente de IA (`src/routes/agente.tsx`):** Container SPA com navegação fluida em abas (Chat, Configurações, Custos, Logs) gerenciada por `activeView`, sem reload de rotas globais.
- **Painéis do Workspace (`src/components/agente/*`):** Componentes extraídos para modularizar a interface, incluindo `CustosPanel`, `ConfiguracoesPanel`, `LogsAgentePanel` e `LogsMotorPanel`.
- **Auto-Titulação do Histórico:** Em `src/routes/agente.tsx`, sistema de requisição assíncrona gerando "Smart Titles" em background para não travar a UI de chat, incluindo limpeza imediata de histórico ao alternar conversas.
- **Regras de Proveniência & Isolamento (`supabase/functions/ai-chat/index.ts`):** Inclusão da `<regra_proibição_alucinação_origem>` e isolamento estrito de histórico por `conversation_id` em `src/routes/agente.tsx`.

## Parsers e Importação
- **Normalização de Nomes de Loja (`src/lib/parsers/storeMapping.ts`):** Dicionário utilitário que padroniza lojas inconsistentes (Maquininha/Juros) usando keys normalizadas em lowercase e mapeamento explícito, protegendo contra hard-ignores destrutivos.
- **Idempotência de Maquininha (`src/components/importacoes/CentralImportWizard.tsx`):** Geração de `fitid` sintético determinístico (`source_store_date_amount_method`) para transações Rede/Taxas/Maquininha, prevenindo duplicações em múltiplas importações do mesmo Excel via onConflict nativo.

- **[Backend] Edge Function sync-oficina**: Motor de sincroniza��o que puxa listas de Contas a Pagar e OSs de forma ass�ncrona do bot.
- **[Backend] Tabelas de Cache de IA**: oficina_contas e oficina_os_cache. Essenciais para o funcionamento condicional (live vs cache) da ferramenta do Agente AI para evitar timeouts no Playwright.

- **[Frontend] Telemetria H�brida**: Pain�is \LogsAgentePanel\ (lendo da tabela \mcp_logs\) e \CacheAgentePanel\ para inspecionar cache nativo das Ordens de Servi�o diretamente pela UI do Agente.
- **[Backend] Automa��o Postgres Cron**: Migration com pg_cron e pg_net para acionar HTTP hooks em background.
