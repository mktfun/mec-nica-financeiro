# Spec Plan: bot-traefik-routing

## Tasks

- [x] [INFRA] Verificar `docker network inspect tork-stack_internal` — confirmar que `traefik` E `conciliamec-bot` estÁo na mesma rede
- [x] [INFRA] Atualizar `cloudflared/config.yml` na VPS — trocar `bot.tork.services → http://conciliamec-bot:3001` para `http://traefik:80`
- [x] [INFRA] Reiniciar container `cloudflared` para aplicar nova config
- [x] [INFRA] Confirmar que `bot/docker-compose.yml` usa rede `tork-stack_internal` com as labels do Traefik corretas
- [x] [INFRA] Fazer `docker compose up -d` no bot (sem rebuild) para registrar labels atualizadas no Docker provider do Traefik
- [x] [TEST] Verificar cenário 1: `curl https://bot.tork.services/health` retorna `{"status":"ok"}`
- [x] [TEST] Verificar cenário 2: `POST /api/sync` sem key retorna `401`
- [x] [TEST] Verificar cenário 3: `POST /api/sync` com `X-Api-Key` aciona bot corretamente
