# 06 — Variáveis de Ambiente & Segurança de Chaves

Para configuração em provedores de nuvem (Vercel, Lovable, VPS), consulte `deploy-production/references/checklist-launch.md`. Para autenticação headless do GitHub CLI, consulte `github-ops/SKILL.md`.

---

## 1. Template `.env.local` (Desenvolvimento Local — NUNCA Commitar)

```bash
# URLs da Aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Conexão Supabase Client & SSR
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_key_here

# Supabase Server-Only (NUNCA expor com prefixo NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role_key_here
DATABASE_URL=postgres://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# GitHub Token (para automações headless de CI e PRs via github-ops)
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 2. Template `.env.example` (Versionado no Git — Sem Segredos Reais)

```bash
# URLs da Aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Conexão Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase Server-Only
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# GitHub Token (opcional para CI/CLI)
GH_TOKEN=
```

---

## 3. Matriz de Segurança & Escopo das Variáveis

| Variável | Exposta no Navegador? | Onde é Utilizada | Riscos de Vazamento |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Sim | Links canônicos, OpenGraph, redirects | Baixo |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Instanciação de cliente SSR / browser | Baixo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Consultas e autenticação sujeitas a RLS | Médio (RLS protege dados) |
| `SUPABASE_SERVICE_ROLE_KEY` | **NUNCA** | Server Actions de admin, Edge Functions | **Crítico** (bypassa 100% de RLS) |
| `DATABASE_URL` | **NUNCA** | Migrações CLI e pooler PostgreSQL | **Crítico** (acesso total ao banco) |
| `GH_TOKEN` | **NUNCA** | Scripts headless do GitHub CLI | **Crítico** (acesso a repositórios) |

---

## 4. Regras de `.gitignore`

Certifique-se de que o `.gitignore` na raiz contenha:
```gitignore
# Arquivos de ambiente locais
.env
.env*.local
*.local

# Permitir template de exemplo
!.env.example
```
