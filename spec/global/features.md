# Features e Módulos Existentes (Mapa Vivo Anti-Duplicação)

## Conciliação & Fechamento
- **Cards de Fechamento por Loja (`src/routes/conciliacao.index.tsx`):** Exibe 6 colunas por loja: Faturamento, Maquininha, PIX, Na Loja OS, Faturamento Itaú (OFX - Saldo Real) e Diferença.
- **Resumo Financeiro Consolidado (`src/components/conciliacao/ResumoDiaPanel.tsx`):** Hero Card único consolidando os saldos da rede, OFX e OSs.
- **Hook `useLatestBankBalance` (`src/hooks/useTransactions.ts`):** Retorna o último saldo real OFX (`bank_total`) por loja para evitar saldo zerado em dias sem importação nova.
- **Hook `useModulo1StoresData` (`src/hooks/useConciliacao.ts`):** Retorna o faturamento, entradas de cartão, PIX das OSs e saldo em aberto real por loja na data.

## Inteligência Artificial & Telemetria
- **Motor de Conciliação Headless (`src/hooks/useBackgroundAiReconciler.ts`):** Dispara automaticamente em background em busca de triplas associações (OS / Maquininha / Banco).
- **Gerador de Associações (`src/lib/llm-matcher.ts`):** Integração com Gemini, OpenAI e Claude. Grava logs em `public.ai_execution_logs`.
- **Painel de Gestão & Telemetria (`src/routes/agente.tsx`):** Abas Chat, Provedores & API Keys, Telemetria & Custos (tokens e R$ BRL) e DevTools Inspector JSON com botão "Executar Teste de IA".
- **Tabela `public.ai_execution_logs`:** Registro imutável de chamadas, tokens, custo estimado, tempo de execução e payloads.
- **Tabela `public.ai_settings`:** Configurações de provedor, modelo e chave de API por usuário ou `GLOBAL`.
- **ConciliaMec Bot (VPS / Traefik):** Serviço headless de coleta de relatórios via Playwright (Oficina Inteligente / Rede), exposto publicamente sob `bot.tork.services` via Cloudflare Tunnel.

- **PromptInput Minimalista (\src/components/chat/PromptInput.tsx\):** Componente avan�ado com anima��es framer-motion-like em CSS puro e auto-resize com blur, substituto do PromptBox.
- **MessageList (\src/components/chat/MessageList.tsx\):** Exibe execu��es de MCP logs via um bloco expans�vel \<details>\ minimalista.
- **Tool Edge Function (\supabase/functions/ai-chat/index.ts\):** Possui a tool \consulta_detalhes_os\ para buscar informa��es no Supabase local de forma ultra-r�pida, contornando chamadas remotas.

