# Features e MÃ³dulos Existentes (Mapa Vivo Anti-DuplicaÃ§Ã£o)

## ConciliaÃ§Ã£o & Fechamento
- **Cards de Fechamento por Loja (`src/routes/conciliacao.index.tsx`):** Exibe 6 colunas por loja: Faturamento, Maquininha, PIX, Na Loja OS, Faturamento ItaÃº (OFX - Saldo Real) e DiferenÃ§a.
- **Resumo Financeiro Consolidado (`src/components/conciliacao/ResumoDiaPanel.tsx`):** Hero Card Ãºnico consolidando os saldos da rede, OFX e OSs.
- **Hook `useLatestBankBalance` (`src/hooks/useTransactions.ts`):** Retorna o Ãºltimo saldo real OFX (`bank_total`) por loja para evitar saldo zerado em dias sem importaÃ§Ã£o nova.
- **Hook `useModulo1StoresData` (`src/hooks/useConciliacao.ts`):** Retorna o faturamento, entradas de cartÃ£o, PIX das OSs e saldo em aberto real por loja na data.

## InteligÃªncia Artificial & Telemetria
- **Motor de ConciliaÃ§Ã£o Headless (`src/hooks/useBackgroundAiReconciler.ts`):** Dispara automaticamente em background em busca de triplas associaÃ§Ãµes (OS / Maquininha / Banco).
- **Gerador de AssociaÃ§Ãµes (`src/lib/llm-matcher.ts`):** IntegraÃ§Ã£o com Gemini, OpenAI e Claude. Grava logs em `public.ai_execution_logs`.
- **Painel de GestÃ£o & Telemetria (`src/routes/agente.tsx`):** Abas Chat, Provedores & API Keys, Telemetria & Custos (tokens e R$ BRL) e DevTools Inspector JSON com botÃ£o "Executar Teste de IA".
- **Tabela `public.ai_execution_logs`:** Registro imutÃ¡vel de chamadas, tokens, custo estimado, tempo de execuÃ§Ã£o e payloads.
- **Tabela `public.ai_settings`:** ConfiguraÃ§Ãµes de provedor, modelo e chave de API por usuÃ¡rio ou `GLOBAL`.
- **ConciliaMec Bot (VPS / Traefik):** ServiÃ§o headless de coleta de relatÃ³rios via Playwright (Oficina Inteligente / Rede), exposto publicamente sob `bot.tork.services` via Cloudflare Tunnel.
- **API `GET /api/os/:id` (Bot VPS):** Endpoint para busca de OS em tempo real via AJAX UpdatePanel direto no sistema legado da Oficina, contornando bloqueios de scraping.

- **PromptInput Minimalista (\src/components/chat/PromptInput.tsx\):** Componente avançado com animações framer-motion-like em CSS puro e auto-resize com blur, substituto do PromptBox.
- **MessageList (\src/components/chat/MessageList.tsx\):** Exibe execuções de MCP logs via um bloco expansível \<details>\ minimalista.
- **Tool Edge Function (\supabase/functions/ai-chat/index.ts\):** Possui a tool \consulta_detalhes_os\ para buscar informações no Supabase local de forma ultra-rápida, contornando chamadas remotas.
  
### ui-refactor  
- Modificado: src/components/conciliacao/RedeVsOfxTable.tsx (Refatorado para formato Extrato)  
- Modificado: src/components/conciliacao/PixVsOfxTable.tsx (Refatorado para formato Extrato)  
- Modificado: src/hooks/useConciliacao.ts (adicionado calculo de taxas em osVsRede)  
- Removido: src/components/conciliacao/ConciliacaoAlertsSection.tsx 

- **Bot de IA / MessageList (chat-ux-bot-fix):** Frontend MessageList reconstruído com framer-motion (spring bounce) e suporte robusto a fetch do VPS bot via Edge Functions.  
## ias-architecture-hub  
- **Tabelas:** claritas_prompts, claritas_policies, gent_reflections  
- **Edge Functions:** ias-hub (Orquestrador do ciclo Critical Thinking + Graphify + Claritas)  
- **Storage:** Bucket knowledge_graph 

### fix-chat-ui
- **Novas Telas de Log:** `src/routes/logs.agente.tsx` e `src/routes/logs.motor.tsx` criadas para exibir as trilhas de auditoria separadas da aba de configurações.
- **Sidebar Agente (`src/routes/agente.tsx`):** Links âncora `Log do Agente IA` e `Log do Motor` restaurados e mapeados para suas novas rotas.
