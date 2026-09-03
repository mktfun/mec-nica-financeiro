---
description: Configura o ambiente headless completo — credenciais, Graphify, bootstrap da memória Obsidian e scaffolding do Antigravity para garantir que a IA opere sem interações manuais.
---

<!-- OPENSPEC:START -->

**Guardrails**

- **OBRIGATÓRIO:** O agente deve operar EXCLUSIVAMENTE em modo "headless". Jamais tente executar comandos que requerem input interativo ou navegação no browser como `supabase login` ou `gh auth login` padrão sem os tokens por environment variable.
- **PROIBIÇÃO ESTRITA:** NUNCA execute comandos `docker` ou rode containers localmente neste ambiente. Todo container (ex: Supabase) deve ser executado exclusivamente na VPS remota via SSH.
- Nunca exiba os tokens abertamente no chat, apenas configure-os no background.
- Lembre o usuário de nunca enviar o token em texto puro para repositórios públicos. Garanta que o `.env` esteja no `.gitignore`.

---

## Step 1 — Validação de Credenciais Locais

Verifique se existe um arquivo `.env` na raiz do projeto com as variáveis `GH_TOKEN` e `SUPABASE_ACCESS_TOKEN`.
Se os tokens existirem, faça a leitura e injete no terminal (export) sempre que for invocar a CLI dessas ferramentas.

## Step 2 — Solicitação e Armazenamento (Se ausente)

Se as variáveis não estiverem configuradas, peça ao usuário para fornecer os tokens:
- GitHub PAT: [https://github.com/settings/tokens](https://github.com/settings/tokens)
- Supabase Access Token: [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)

Assim que o usuário fornecer, escreva no arquivo `.env` (certificando-se do `.gitignore`).

## Step 3 — Configuração Global Headless

```bash
git config --global user.name "Agent"
git config --global user.email "agent@project.local"
```

Antes de qualquer comando `gh`:
```powershell
$env:GH_TOKEN = "<valor do .env>"
```

Antes de qualquer comando `supabase`:
```powershell
$env:SUPABASE_ACCESS_TOKEN = "<valor do .env>"
```

## Step 4 — Scaffolding do Antigravity

Crie a pasta `.agent` na raiz do projeto se não existir:

```bash
mkdir -p .agent/memory
mkdir -p .agent/agents
mkdir -p .agent/workflows
mkdir -p .agent/rules
mkdir -p specs/global
```

---

## Step 4b — Bootstrap da Memória Modular (Obsidian)

Leia o protocolo de memória antes de criar os arquivos:
```
view_file C:/Users/User/.gemini/config/skills/obsidian/SKILL.md
```

Crie os arquivos de memória modular com cabeçalho inicial. **Não invente conteúdo** — apenas o cabeçalho vazio para o projeto começar a popular:

**`.agent/memory/ui.md`:**
```markdown
# UI Memory — Projeto: [nome do projeto]
> Criado em: [data]. Atualizado pelo /vibe-archive após cada feature.
> Contém: componentes React criados, padrões visuais definidos, anti-patterns UI.

<!-- Entradas adicionadas pelo /vibe-archive -->
```

**`.agent/memory/supabase.md`:**
```markdown
# Supabase Memory — Projeto: [nome do projeto]
> Criado em: [data]. Atualizado pelo /vibe-archive após cada feature.
> Contém: tabelas criadas, RPCs ativas, políticas RLS, regras críticas de banco.

<!-- Entradas adicionadas pelo /vibe-archive -->
```

**`.agent/memory/auth.md`:**
```markdown
# Auth Memory — Projeto: [nome do projeto]
> Criado em: [data]. Atualizado pelo /vibe-archive após cada feature.
> Contém: fluxos de autenticação, padrões de sessão, permissões e roles.

<!-- Entradas adicionadas pelo /vibe-archive -->
```

**`.agent/memory/infra.md`:**
```markdown
# Infra Memory — Projeto: [nome do projeto]
> Criado em: [data]. Atualizado pelo /vibe-archive após cada feature.
> Contém: configurações de deploy, DNS, VPS, variáveis de ambiente usadas.

<!-- Entradas adicionadas pelo /vibe-archive -->
```

**`.agent/memory/domain.md`:**
```markdown
# Domain Memory — Projeto: [nome do projeto]
> Criado em: [data]. Atualizado pelo /vibe-archive após cada feature.
> Contém: regras de negócio do domínio, lógicas específicas do produto.

<!-- Entradas adicionadas pelo /vibe-archive -->
```

Crie categorias adicionais conforme o projeto precisar (ex: `memory/payments.md`, `memory/integrations.md`).

---

## Step 4c — Indexação Inicial do Grafo (Graphify)

> Graphify é Python. Instalar com: `uv tool install graphifyy` (dois Y no pacote, um Y no comando).

```bash
# Primeira indexação — varre todos os arquivos do projeto
graphify .

# Confirmar que o grafo foi gerado
graphify update
```

Confirme que `graphify-out/graph.json` foi criado com sucesso.

Se falhar com "command not found":
```bash
uv tool install graphifyy
graphify .
```

---

## Step 5 — Confirmação Silenciosa

Execute um teste rápido:
```bash
gh auth status
supabase projects list
```

Informe ao usuário que o setup foi concluído com:
- ✅ Credenciais configuradas (headless)
- ✅ Memória Obsidian inicializada em `.agent/memory/`
- ✅ Grafo indexado em `graphify-out/graph.json`
- ✅ Estrutura `.agent/` criada

---

## Lovable Setup (se projeto tem UI)

Se o projeto inclui frontend/app web, execute automaticamente:

1. `list_workspaces()` → captura `workspace_id`
2. `create_project(workspace_id, description="{nome-do-projeto}", initial_message="{spec do projeto}")`
3. `set_project_knowledge(project_id, "Stack: React + Vite + Tailwind + shadcn/ui. TypeScript strict. Zustand para estado. Supabase para DB.")`
4. Se precisar de banco: `enable_database(project_id)` → aguarda 30-60s
5. Salva `project_id` e `preview_url` em `.antigravity/state.json`

---

## Infra bootstrap rules

Durante o setup, detectar automaticamente se o projeto exige deploy, domínio, backend, auth, database ou integração com Supabase self-hosted em VPS:

1. Habilitar modo infra-aware.
2. Carregar ou inicializar `.antigravity/state.json` preenchendo os blocos `lovable`, `cloudflare`, `supabase` e `infra`.
3. Marcar providers ativos (ex: `frontend_provider=lovable`, `dns_provider=cloudflare`, `backend_provider=supabase_self_hosted`).
4. Solicitar os itens abaixo caso não existam, enviando os links diretos:
   - Token da Cloudflare: [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
     - **AVISO OBRIGATÓRIO DA IA**: Informe ao usuário exatamente quais permissões marcar: "Zone → Zone → Read" e "Zone → DNS → Edit" para "All zones".
   - Domínio base na Cloudflare, IP/host da VPS e usuário/senha SSH.

---

## Secret handling

- Credenciais da IA ficam em `.agent/.env_agent` — separado do `.env` da aplicação
- Nunca grave tokens em arquivos do repositório, spec ou state
- Se receber segredo em texto puro, use somente na execução atual e normalize para referência:
  `env:VPS_HOST`, `env:CLOUDFLARE_API_TOKEN`

<!-- OPENSPEC:END -->
