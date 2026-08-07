# Design: bot-traefik-routing

## Arquitetura Técnica

```
[Cloudflare Zero Trust Dashboard]
  bot.tork.services → Tunnel → cloudflared → http://traefik:80
                                                      ↓
                                          [Traefik Docker Provider]
                                          Router: Host("bot.tork.services")
                                                      ↓
                                          [conciliamec-bot container]
                                          Service: port 3001
                                                      ↓
                                          [Express API w/ API Key]
                                          GET  /health (público)
                                          POST /api/sync (X-Api-Key)
                                          POST /api/sync/oficina
                                          POST /api/sync/rede
```

## Por que o Traefik consegue rotear

O Traefik usa `--providers.docker=true` e lê o `/var/run/docker.sock`.
Ele descobre containers automaticamente via labels Docker — desde que:
1. O container tenha `traefik.enable=true`
2. O container esteja na mesma rede Docker que o Traefik monitora
3. A regra de roteamento (`Host(...)`) seja válida

O Traefik do tork-stack está na rede `internal`. O bot precisar estar na mesma rede.
A rede `tork-stack_internal` é o nome externo da rede `internal` do compose do tork-stack.

## Mudanças Técnicas

### 1. `bot/docker-compose.yml` — Rede correta
```yaml
# A rede deve ser: tork-stack_internal (nome externo da rede "internal" do tork-stack)
networks:
  tork-stack_internal:
    external: true
```
Labels do Traefik (já existem, confirmar):
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.conciliamec-bot.rule=Host(`bot.tork.services`)"
  - "traefik.http.routers.conciliamec-bot.entrypoints=web"
  - "traefik.http.services.conciliamec-bot.loadbalancer.server.port=3001"
```

### 2. `cloudflared/config.yml` — Reverter para Traefik
```yaml
ingress:
  - hostname: chat.tork.services
    service: http://traefik:80
  - hostname: evo.tork.services
    service: http://traefik:80
  - hostname: minio.tork.services
    service: http://traefik:80
  - hostname: traefik.tork.services
    service: http://traefik:80
  - hostname: bot.tork.services
    service: http://traefik:80   # ← VIA TRAEFIK (não direto ao container)
  - service: http_status:404
```

## Cenários de Verificação

- **Cenário 1 (Health):** `curl https://bot.tork.services/health` → `{"status":"ok",...}` — sem auth
- **Cenário 2 (Auth required):** `curl -X POST https://bot.tork.services/api/sync` → `401 Unauthorized`
- **Cenário 3 (Auth ok):** `curl -X POST https://bot.tork.services/api/sync -H "X-Api-Key: cmk-bot-2026-mktfun-xK9pL3"` → `{"success":true,...}`
- **Cenário 4 (Rede):** `docker network inspect tork-stack_internal` → lista `conciliamec-bot` e `traefik`
