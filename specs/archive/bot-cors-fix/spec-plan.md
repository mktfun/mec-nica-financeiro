# Spec Plan: Correção de CORS no Bot Playwright (bot-cors-fix)

## Tasks

- [x] [BACKEND] Instalar `@fastify/cors` no diretório do bot (`mcp-oficina-standalone`).
- [x] [BACKEND] Modificar `src/oficina-agent/server/app.ts` (do bot) importando `@fastify/cors` e chamando `fastify.register(cors, { origin: '*', ... })` antes da inicialização das rotas.
- [x] [TEST] Rodar o servidor bot via npm start/dev e testar a conexão diretamente pelo painel do Lovable (botão "Testar Conexão"), confirmando se o CORS foi resolvido.
