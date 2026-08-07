# Spec Plan: bot-agent-alignment (Bot Agent Alignment)

## Tasks

- [x] [BACKEND] Refatorar scraper `fetchOSDetailedView` em `bot/src/scrapers/oficina.ts` para criar dinamicamente a pasta de `tmp` ou silenciar as exceções (try/catch) de `writeFileSync` no modo de produçÁo.
- [x] [EDGE FUNCTION] Ajustar `ai-chat/index.ts` system prompt, explicitando a URL de produçÁo e isolando o modelo local de IPs fixos e ambientes internos.
- [x] [TEST] Verificar cenário 1: Executar `curl` na URL oficial (`https://bot.tork.services/api/os/detalhe/1044`) para certificar que o bot responde publicamente ao longo do proxy.
- [x] [TEST] Verificar cenário 2: Simular uma requisiçÁo real pela Edge Function que use explicitamente a nova diretriz de proxying oficial, analisando a formataçÁo e ausência de erro de infra (ENOENT).
