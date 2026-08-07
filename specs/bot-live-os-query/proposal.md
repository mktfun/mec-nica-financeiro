# Proposal: Consulta Live de OS no Bot Oficina Inteligente (bot-live-os-query)

## Problema
A consulta atual de Ordens de Serviço (OS) realizada pela IA (ferramenta `consulta_detalhes_os`) acessa apenas a tabela local do Supabase, que pode estar desatualizada. O bot Node.js (`bot/src/scrapers/oficina.ts`) possui esqueletos de login, mas não possui um fluxo validado e testado para acessar o painel da Oficina Inteligente ao vivo, pesquisar por uma OS específica e retornar os detalhes "praticamente como se fosse um MCP mesmo". 

## Solução Proposta
1. **Bot (Scraper):** Implementar e validar a função `consultarOsLive(page, osNumber)` em `bot/src/scrapers/oficina.ts` usando Playwright. Ela deverá acessar a listagem de OS, usar o filtro de busca pelo número, e extrair os dados da tabela (Status, Cliente, Valor, Placa, etc).
2. **Bot (API):** Expor a rota `POST /api/query-os` no `bot/src/server.ts` que recebe `osNumber`, executa o scraper e retorna JSON.
3. **Validação e Testes:** Criar um script de teste em `bot/src/tests/test-oi-login.ts` (ou equivalente) que roda isoladamente, faz login na Oficina Inteligente e tira uma screenshot ou printa o HTML resultante para validarmos os seletores reais sem precisar do fluxo completo do Traefik.
4. **Supabase (Edge Function):** Alterar a ferramenta `consulta_detalhes_os` em `ai-chat/index.ts` para que, além (ou em vez) de consultar o banco local, ela faça uma requisição HTTP via fetch para `bot.tork.services/api/query-os` com a API Key, trazendo os dados 100% atualizados.

## Contratos de Dados
- **Request (`/api/query-os`):** `{ "osNumber": "1763" }` com Header `x-api-key`.
- **Response:** `{ "success": true, "data": { "osNumber": "1763", "cliente": "...", "status": "Finalizada", "valor": 1500.00 } }`

## API / Interface
- `bot/src/server.ts` ganha nova rota `/api/query-os`.
- A Edge Function `ai-chat` fará um `fetch` seguro utilizando as variáveis de ambiente `MCP_URL` (bot.tork.services) e `WORKER_API_KEY`.

## Features Existentes Impactadas
- **ConciliaMec Bot:** Adicionada capacidade on-demand de scraper síncrono.
- **Agent Chat (`ai-chat`):** Upgrade da tool de OS para ser híbrida ou totalmente Live.

## Risco Principal
- Mudanças de layout ou bloqueios (Cloudflare/CAPTCHA) na Oficina Inteligente. A implementação de um script isolado de teste mitigará esse risco, permitindo inspecionar o DOM caso falhe. O uso de `withRetry` existente no bot será crucial.
