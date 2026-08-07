# Proposal: bot-agent-alignment (Bot Agent Alignment)

## Problema
O agente de IA foi configurado em desenvolvimento para acessar o bot da VPS via `localhost` (127.0.0.1) ou caminhos de filesystem locais. Além disso, a extraçÁo de dados do detalhamento de OS (`fetchOSDetailedView`) apresenta erro interno (`ENOENT`) por tentar gravar arquivos HTML de debug em diretórios inexistentes. A arquitetura correta exige que a IA se comunique de forma puramente funcional, enxergando o bot exclusivamente através do endpoint público `https://bot.tork.services`, sem acesso a infraestrutura, filesystem ou IPs diretos.

## SoluçÁo Proposta
- **SupressÁo de Debug do Bot:** Alterar o `fetchOSDetailedView` para que, em produçÁo, nÁo tente salvar arquivos temporários de DOM (ou garanta que o diretório seja criado se for no modo debug isolado), evitando o erro `ENOENT`.
- **RefatoraçÁo do Prompt do Sistema da IA:** Reforçar no System Prompt do Agente IA (no Supabase Edge Function `ai-chat`) que ele *apenas* interage com o Oficina via URL oficial `https://bot.tork.services` protegida por `X-Api-Key`. O cérebro da IA nÁo deve nunca tentar supor acessos diretos.
- **Teste de Ponta a Ponta via Endpoint Público:** As requisições de validaçÁo usarÁo chamadas diretamente contra `https://bot.tork.services` com os devidos cabeçalhos de autenticaçÁo para provar que a integraçÁo de produçÁo funciona perfeitamente sem amarras locais.

## Contratos de Dados
- Nenhuma alteraçÁo nas tabelas Supabase. 
- O contrato da requisiçÁo `GET /api/os/detalhe/:id` será testado publicamente. O retorno será exatamente a interface `OSDetailedRecord`.

## API / Interface
- Edge Function `ai-chat`: Ajuste no system prompt reforçando o comportamento "stateless network client".

## Features Existentes Impactadas
- Supabase Edge Function `ai-chat/index.ts`
- ConciliaMec Bot Endpoint `GET /api/os/detalhe/:id` (`bot/src/scrapers/oficina.ts`)

## Risco Principal
- O endpoint remoto `https://bot.tork.services/api/os/detalhe/:id` pode sofrer lentidÁo ou timeout por limitaçÁo de sessÁo ou instabilidade do Cloudflare Tunnel. O erro ENOENT deve sumir completamente.
