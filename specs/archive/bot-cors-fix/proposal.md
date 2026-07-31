# Proposal: Correção de CORS no Bot Playwright (bot-cors-fix)

## Problema
Ao tentar salvar ou testar a conexão com o bot (`bot.tork.services`) pelo frontend (`conciliamec.lovable.app`) rodando no navegador do usuário, a requisição `fetch` é bloqueada pela política de segurança CORS (Cross-Origin Resource Sharing). O servidor do bot (implementado em Fastify) não está emitindo os cabeçalhos `Access-Control-Allow-Origin` para permitir origens externas.

## Solução Proposta
1. Instalar o pacote oficial `@fastify/cors` no projeto do bot (`mcp-oficina-standalone`).
2. Registrar o plugin de CORS no arquivo de inicialização do servidor (`src/oficina-agent/server/app.ts`), permitindo chamadas de qualquer origem (`*`) ou especificando as origens da Lovable, para que o painel consiga invocar o `/health` e os atalhos de sincroinzação.

## Contratos de Dados
- Nenhuma alteração em tabelas ou variáveis do Supabase. Apenas regras de rede HTTP (Headers CORS) do servidor do Bot.

## API / Interface
- **Fastify `app.ts`**: Adição do middleware/plugin `@fastify/cors`. O endpoint `/health` não mudará o formato da resposta, apenas passará a emitir o Header `Access-Control-Allow-Origin: *`.

## Features Existentes Impactadas
- **`src/oficina-agent/server/app.ts`**: Inicialização do servidor Fastify do Bot.

## Risco Principal
Esquecer de instalar o pacote `@fastify/cors` e apenas tentar importar. O build do TypeScript no bot pode falhar se os *types* de CORS não forem suportados diretamente ou se faltar a dependência.
