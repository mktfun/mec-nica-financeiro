# Proposal: Roteamento bot.tork.services via Traefik (bot-traefik-routing)

## Problema
- O Cloudflare Zero Trust Tunnel já roteia `bot.tork.services → http://traefik:80` ✅
- O Traefik usa `--providers.docker.exposedbydefault=false`, entÁo ele só descobre containers que estÁo NA MESMA rede Docker que ele E com `traefik.enable=true`.
- A rede do Traefik se chama `internal` (alias Docker compose: `tork-stack_internal` externamente).
- O container `conciliamec-bot` está na rede `tork-stack_internal` COM labels de Traefik corretas, MAS pode nÁo estar sendo descoberto porque as labels estÁo corretas mas o container precisa ser visível pelo Docker provider do Traefik.
- O cloudflared config atual foi editado para `bot.tork.services → http://conciliamec-bot:3001` diretamente — isso precisa ser revertido para `http://traefik:80`.

## SoluçÁo Proposta

1. **Corrigir `cloudflared/config.yml`** na VPS: trocar `bot.tork.services → http://conciliamec-bot:3001` de volta para `http://traefik:80` (alinhado com o que o usuário configurou no Zero Trust dashboard).
2. **Verificar e corrigir Traefik labels no `bot/docker-compose.yml`**: garantir que o container `conciliamec-bot` tem `traefik.enable=true` e está na mesma rede `internal` / `tork-stack_internal` que o Traefik consegue monitorar.
3. **Reiniciar cloudflared** para aplicar a config atualizada.
4. **Testar endpoint público** `https://bot.tork.services/health`.

## Contratos de Dados
- Sem banco de dados envolvido — é puro roteamento de rede Docker + Cloudflare.

## API / Interface

**Fluxo completo após implementaçÁo:**
```
Usuário/Agent HTTP
  → HTTPS: https://bot.tork.services
  → Cloudflare Zero Trust Tunnel (já configurado pelo usuário)
  → cloudflared container → http://traefik:80
  → Traefik (router: Host("bot.tork.services"))
  → conciliamec-bot:3001
  → Express API (com X-Api-Key obrigatório nos /api/* endpoints)
```

**Endpoints disponíveis após roteamento:**
- `GET  https://bot.tork.services/health` — público, sem auth
- `POST https://bot.tork.services/api/sync` — requer `X-Api-Key: cmk-bot-2026-mktfun-xK9pL3`
- `POST https://bot.tork.services/api/sync/oficina` — requer API Key
- `POST https://bot.tork.services/api/sync/rede` — requer API Key

## Features Existentes Impactadas
- `bot/docker-compose.yml`: labels do Traefik já existem mas podem precisar de ajuste de rede.
- `cloudflared/config.yml` no servidor: revertido para usar `http://traefik:80`.

## Risco Principal
O Traefik usa `/var/run/docker.sock` para descoberta, mas só descobre containers na mesma rede Docker. Se o `conciliamec-bot` nÁo estiver acessível pelo Traefik via rede `internal`, o roteamento falha com 404. **MitigaçÁo:** verificar explicitamente a rede compartilhada entre os dois containers.
