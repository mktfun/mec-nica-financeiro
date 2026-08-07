# Spec Plan: Consulta Live de OS no Bot Oficina Inteligente (bot-live-os-query)

## Tasks

- [ ] [BACKEND/BOT] Criar script de teste exploratório `bot/src/tests/test-os-query.ts` que inicializa o Playwright, faz `loginOI`, navega até a listagem de OS, e gera um screenshot + dump do HTML para descobrirmos os seletores exatos.
- [ ] [TEST] Executar o teste `test-os-query.ts` localmente com credenciais do `.env`, extrair os seletores corretos do input de busca e da tabela de OS.
- [ ] [BACKEND/BOT] Implementar a funçÁo `queryOsLive(page, osNumber)` real em `bot/src/scrapers/oficina.ts` usando os seletores descobertos.
- [ ] [BACKEND/BOT] Adicionar rota `POST /api/query-os` em `bot/src/server.ts` que recebe `osNumber` e executa a funçÁo acima.
- [ ] [BACKEND/SUPABASE] Modificar `supabase/functions/ai-chat/index.ts`: atualizar a tool `consulta_detalhes_os` para realizar `fetch` no `bot_url/api/query-os` usando a `bot_api_key`.
- [ ] [TEST] Validar fluxo no chat (`agente.tsx`), garantindo que a IA mostra a consulta no bloco UI e retorna a OS real baseada no Bot MCP.
