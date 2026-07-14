---
description: Configuração inicial do ambiente headless para garantir que a IA consiga usar ferramentas como Supabase e GitHub CLI sem interações manuais ou pop-ups.
---

<!-- OPENSPEC:START -->

**Guardrails**

- **OBRIGATÓRIO:** O agente deve operar EXCLUSIVAMENTE em modo "headless". Jamais tente executar comandos que requerem input interativo ou navegação no browser como `supabase login` ou `gh auth login` padrão sem os tokens por environment variable.
- **PROIBIÇÃO ESTRITA:** NUNCA execute comandos `docker` ou rode containers localmente neste ambiente. Absolutamente NADA de containers rodando localmente. Todo e qualquer container (ex: Supabase) deve ser executado exclusivamente na VPS remota via SSH.
- Nunca exiba os tokens abertamente no chat, apenas configure-os no background.
- Lembre o usuário de nunca enviar o token em texto puro para repositórios públicos. Garanta que o `.env` esteja no `.gitignore`.

**Skills a utilizar**
- As skills `github` e `supabase` devem ser operadas estritamente sob este fluxo invisível de configuração.

**Steps**

1. **Validação de Credenciais Locais:**
   - Verifique se existe um arquivo `.env` na raiz do projeto com as variáveis `GH_TOKEN` e `SUPABASE_ACCESS_TOKEN`.
   - Se os tokens existirem, faça a leitura e injete as variáveis no terminal (export) sempre que for invocar a CLI dessas ferramentas.

2. **Solicitação e Armazenamento (Se ausente):**
   - Se as variáveis não estiverem configuradas, peça ao usuário para fornecer os tokens enviando os links exatos de onde obtê-los:
     - GitHub PAT: [https://github.com/settings/tokens](https://github.com/settings/tokens)
     - Supabase Access Token: [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
   - Assim que o usuário fornecer, escreva essas chaves de forma segura no arquivo `.env` (certificando-se do `.gitignore`).

3. **Configuração Global Headless:**
   - Configuração silenciosa do Git:
     `git config --global user.name "Your Name"`
     `git config --global user.email "your-email@example.com"`
   - Para interagir com repositórios remotos sem pedir senha, o agente usará estritamente a variável de ambiente:
     `$env:GH_TOKEN="<token>"` (Windows) ou `export GH_TOKEN="<token>"` (Linux/Mac) antes de executar comandos do GitHub CLI (`gh`).
   - O mesmo se aplica ao Supabase:
     `$env:SUPABASE_ACCESS_TOKEN="<token>"` ou `export SUPABASE_ACCESS_TOKEN="<token>"` antes de qualquer comando `supabase`.

4. **Scaffolding do Antigravity:**
   - Crie a pasta `.agent` na raiz do projeto se não existir.
   - Crie `.agent/memory.md` com "Preferências de Arquitetura", "Erros Passados" e "Persona do Usuário".
   - Instale e inicialize o motor determinístico anti-alucinação executando no terminal:
     `uv tool install graphifyy`
     `graphify antigravity install`
     `/graphify .`
   - Certifique-se de que a pasta `graphify-out/` e os relatórios (como `graph.json`) foram gerados corretamente.

5. **Confirmação Silenciosa:**
   - Execute um teste rápido (ex: `gh auth status` ou `supabase projects list`) para garantir que o login via token funcionou perfeitamente.
   - Informe ao usuário que o setup invisível foi concluído.

## Lovable Setup (se projeto tem UI)

Se o projeto inclui frontend/app web, execute automaticamente:

1. `list_workspaces()` → captura `workspace_id`
2. `create_project(workspace_id, description="{nome-do-projeto}", initial_message="{spec do projeto}")`
3. `set_project_knowledge(project_id, "Stack: React + Vite + Tailwind + shadcn/ui. TypeScript strict. Zustand para estado. Supabase para DB.")`
4. Se precisar de banco: `enable_database(project_id)` → aguarda 30-60s
5. Salva `project_id` e `preview_url` em `.antigravity/state.json`

## Infra bootstrap rules

Durante o setup, detectar automaticamente se o projeto exige deploy, domínio, backend, auth, database ou integração com Supabase self-hosted em VPS:

1. Habilitar modo infra-aware.
2. Carregar ou inicializar `.antigravity/state.json` preenchendo os blocos `lovable`, `cloudflare`, `supabase` e `infra`.
3. Marcar providers ativos (ex: `frontend_provider=lovable`, `dns_provider=cloudflare`, `backend_provider=supabase_self_hosted`).
4. Solicitar os itens abaixo caso não existam, enviando os links diretos para facilitar a vida do usuário:
   - Token da Cloudflare: [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
     - **AVISO OBRIGATÓRIO DA IA**: Você DEVE informar ao usuário exatamente quais permissões marcar na Cloudflare: "Zone -> Zone -> Read" e "Zone -> DNS -> Edit" para "All zones". Nunca jogue apenas o link.
   - Domínio base na Cloudflare, IP/host da VPS e usuário/senha SSH.

## Secret handling

- O contexto interno da IA, chaves de API para os workflows, credenciais de QA Visual (ex: `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`) e tokens operacionais (Cloudflare, VPS, etc) devem ser armazenados em um `.env` **isolado e exclusivo da IA** (ex: `.antigravity/.env` ou `.agent/.env_agent`), mantendo-o completamente separado do `.env` público da aplicação.
- Nunca gravar senha da VPS, token Cloudflare ou secrets do Supabase (`POSTGRES_PASSWORD`, `JWT_SECRET`, etc) em arquivos do repositório, spec ou state.
- Permitir apenas referências no state:
  - `env:VPS_HOST`
  - `env:VPS_USER`
  - `env:VPS_PASSWORD`
  - `env:CLOUDFLARE_API_TOKEN`
- Se receber um segredo em texto puro do usuário, use-o apenas na execução atual e normalize para referência de ambiente no `state.json`.

<!-- OPENSPEC:END -->
