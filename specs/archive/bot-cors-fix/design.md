# Design: Correção de CORS no Bot Playwright (bot-cors-fix)

## Arquitetura Técnica
Nenhuma alteração na arquitetura geral. O bot que roda Fastify simplesmente passará a responder adequadamente às requisições preflight (`OPTIONS`) do navegador, permitindo que a camada de frontend interaja com ele.

## Interfaces TypeScript
*Nenhuma nova interface de banco de dados ou frontend criada.*

## Componentes / Hooks / Funções
- **`mcp-oficina-standalone/package.json`**: Adição de `@fastify/cors` na listagem de `dependencies`.
- **`mcp-oficina-standalone/src/oficina-agent/server/app.ts`**:
```typescript
import cors from '@fastify/cors';

const fastify = Fastify({ logger: true });

async function start() {
  await fastify.register(cors, { 
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Api-Key']
  });
  
  await setupRoutes(fastify);
// ...
```

## Fluxo de UI
Nenhuma mudança no painel da IA. Apenas a barra vermelha do erro no console será extinta e o botão "Testar Conexão" passará a ficar verde (sucesso).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Clicar no botão "Testar Conexão" da UI do painel do Agente.
  - *Estado Inicial:* A página fará um Fetch.
  - *Ação:* Requisição `OPTIONS` enviada ao servidor Fastify na porta 3333 (via tunel Cloudflare porta 443).
  - *Resultado Esperado:* Servidor deve responder 200/204 para o OPTIONS com os Headers CORS, e então processar o GET /health com sucesso.
