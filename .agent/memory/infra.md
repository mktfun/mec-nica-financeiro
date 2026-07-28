# 🧠 Memória Modular: Infraestrutura (Deploy, VPS, DNS, Redes)

## [2026-07-28] — Feature ID: bot-traefik-routing

**Contexto:** Configuração do bot (Playwright) para receber requisições do Cloudflare Tunnel passando pelo Traefik na mesma rede interna do stack.

**Regra aprendida:**
- **Redes Docker + Traefik:** O Traefik só roteia para containers que (1) tenham as labels `traefik.enable=true`, e (2) compartilhem fisicamente a **mesma rede Docker** onde o proxy está operando (ex: `tork-stack_internal`).
- **Playwright no Docker:** A variável de ambiente `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` fornecida pelo Dockerfile (Alpine/Debian) só funciona se explicitamente repassada no construtor `chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })`. O Playwright ignora a env var automaticamente no Node.js.

**Risco identificado:** Tentar mapear domínios Cloudflare diretamente para portas de containers isolados fura o design do load balancer (Traefik) e pode causar timeouts se a rede não for cruzada.

**Não fazer:** Nunca inicializar `chromium.launch()` sem passar `executablePath` em ambientes containerizados headless, pois o path default costuma falhar sem os binários completos baixados via `npx playwright install`.
