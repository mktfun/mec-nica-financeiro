# Features
- Importação Inteligente de Relatórios (XLS, OFX).
- Caixa Físico (Dinheiro).
- Match Triplo (OS vs Maquininha vs Banco) com D+1 [Spec 051].
- UI de Configurações Remotas de Bot & Telemetria do Playwright (`src/routes/agente.tsx`, `useBotLogs.ts`).
- Integração MCP Nativa via Tool Calling no Vercel AI SDK (`ai-chat` e `mcp-proxy` edge functions).
- Bot Standalone com API HTTP em Fastify + `@fastify/cors` para integrações web (Playwright Headless).
