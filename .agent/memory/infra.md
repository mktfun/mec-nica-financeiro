# 🧠 Memória Modular: Infraestrutura (Deploy, VPS, DNS, Redes)

## [2026-07-28] — Feature ID: bot-cors-fix

**Contexto:** Correção de bloqueio CORS no servidor do bot headless rodando via Fastify. A ausência de headers bloqueava chamadas preflight (`OPTIONS`) feitas diretamente pelo frontend Lovable (no painel de testes do Agente).

**Regra aprendida:**
- **Fastify e CORS:** Por padrão, o Fastify não responde a requisições preflight (`OPTIONS`). É estritamente necessário registrar o plugin `@fastify/cors` configurando `origin`, `methods` e `allowedHeaders` antes da declaração de qualquer rota (`await setupRoutes(fastify)`).
- **Integração Frontend-Bot:** Se um painel client-side precisa interagir com um servidor externo em subdomínio (ex: `bot.tork.services`), o backend do bot precisa explicitamente emitir o header `Access-Control-Allow-Origin`. 

**Risco identificado:** A falta do plugin do CORS causa erros obscuros de "fetch failed" (`net::ERR_FAILED`) no console do navegador, dando a impressão falsa de que o domínio está offline, quando na verdade o erro ocorre porque o Options falhou.

**Não fazer:** Nunca subir um serviço (Fastify/Express) que vai ser invocado por frontends sem incluir explicitamente a configuração de CORS.

## [2026-07-28] — Feature ID: bot-traefik-routing

**Contexto:** Configuração do bot (Playwright) para receber requisições do Cloudflare Tunnel passando pelo Traefik na mesma rede interna do stack.

**Regra aprendida:**
- **Redes Docker + Traefik:** O Traefik só roteia para containers que (1) tenham as labels `traefik.enable=true`, e (2) compartilhem fisicamente a **mesma rede Docker** onde o proxy está operando (ex: `tork-stack_internal`).
- **Playwright no Docker:** A variável de ambiente `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` fornecida pelo Dockerfile (Alpine/Debian) só funciona se explicitamente repassada no construtor `chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })`. O Playwright ignora a env var automaticamente no Node.js.

**Risco identificado:** Tentar mapear domínios Cloudflare diretamente para portas de containers isolados fura o design do load balancer (Traefik) e pode causar timeouts se a rede não for cruzada.

**Não fazer:** Nunca inicializar `chromium.launch()` sem passar `executablePath` em ambientes containerizados headless, pois o path default costuma falhar sem os binários completos baixados via `npx playwright install`.

## [2026-07-29] — Feature ID: bot-agent-alignment

**Contexto:** Transição da comunicação do agente de IA com o bot headless de acessos diretos via IP/localhost para a URL oficial em produção via Cloudflare Tunnel (`bot.tork.services`). O bot foi ajustado para silenciar falhas de permissão de gravação no file system (erro ENOENT) que aconteciam ao rodar no ambiente restrito do Docker da VPS.

**Regra aprendida:**
- **Acesso Stateless:** Agentes de nuvem (Edge Functions) não podem assumir acesso a pastas locais ou IPs privados. A ferramenta do Agente deve apontar para endpoints públicos seguros via X-API-Key.
- **Docker Build vs Copy:** Executar `docker cp` para injetar código TypeScript dentro de um container rodando o app via dist (compilado) não surte efeito sem executar `tsc` novamente. O ideal é comitar as mudanças, rodar `git pull` na VPS e em seguida `docker compose build` e `docker compose up -d`.

**Risco identificado:** Alterar o código localmente sem comitar/deployar para a VPS criava uma falsa sensação de erro ao testar a URL de produção remota, gerando 404s por falta de roteamento atualizado.

**Não fazer:** Nunca deixar scripts de scraper (Playwright) dependendo de `fs.writeFileSync` para depuração no ambiente de produção sem envolver em bloco `try/catch` robusto.

## [2026-07-29] — Feature ID: oficina-system-connector

**Contexto:** Expansão do Bot headless de um conector de OS para um conector sistêmico completo (Financeiro, Agenda, Config). O servidor Express passou de 2 para 11 endpoints de leitura. A Edge Function `ai-chat` passou de 5 para 9 tools.

**Regra aprendida:**
- **Padrão de helper `createBotSession(lojaSlug?)`:** Toda vez que o bot precisar criar um browser Playwright, deve-se usar um helper centralizado que (1) busca credenciais via `getBotCredentials`, (2) lança o browser, (3) faz login, (4) chama `ensureCompany(page, idEmpresaOI)` se `lojaSlug` for fornecido. Isso elimina ~30 linhas de código duplicado por endpoint.
- **`ensureCompany` é tolerante a falha:** Se o dropdown `select[id*="ddlEmpresa"]` não for encontrado (tela não tem troca de empresa) ou se `id_empresa_oi === "DESCOBRIR"`, a função retorna silenciosamente via warn — nunca lança exceção. Isso garante que todos os scrapers funcionam mesmo quando o mapeamento de empresa está incompleto.
- **`extractGrid` genérico:** A função `extractGrid(page, hint)` é o padrão para qualquer tela ASP.NET WebForms com grid. Usa `table[id*="${hint}"]`, espera 10s, e extrai headers + rows como array de Record<string,string>. Em timeout → retorna `[]` sem exceção.
- **Slugs de loja devem suportar aliases:** O arquivo `empresas.json` deve ter o campo `aliases: string[]` porque usuários vão escrever "Jabaquara", "JAB", "jab", "jab_jabaquara" de formas diferentes. `resolveEmpresa()` faz match por: (1) store_id exato, (2) empresa_slug exato, (3) substring de aliases.
- **`id_empresa_oi` é o campo crítico não-preenchível automaticamente:** O ID interno do Oficina para troca de empresa via dropdown só pode ser descoberto manualmente (inspecionando o HTML do select ou rodando o bot headed). Deve ser marcado como `"DESCOBRIR"` até ser confirmado.

**Risco identificado:**
- Se `id_empresa_oi` estiver como `"DESCOBRIR"`, o bot não trocará de empresa e retornará dados da empresa padrão logada — sem erro explícito. O usuário precisa preencher esse campo para garantir isolamento multi-empresa.
- O deploy do código bot na VPS requer `git pull + docker compose build + docker compose up -d`. Sem isso, os novos endpoints retornam 404 mesmo após o push no GitHub.

**Não fazer:**
- Nunca criar endpoints de leitura do Oficina sem exigir `loja` como parâmetro obrigatório — o Oficina é multi-empresa e retornar dados da empresa padrão sem avisar causa confusão silenciosa.
- Nunca lançar exceção não tratada nos scrapers — use sempre o padrão `return { warning: "...", parcial: [] }` para que o agente IA possa informar o usuário de forma graciosa em vez de quebrar.
