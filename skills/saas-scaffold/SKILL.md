---
name: saas-scaffold
description: Scaffolding completo e bootstrap orchestrator para SaaS full-stack — Next.js 14+ App Router, Supabase, shadcn/ui e Lovable. Delega para os skills modulares especializados.
triggers: [criar projeto, novo projeto, setup inicial, scaffold, inicializar, bootstrap, criar saas]
---

# SaaS Scaffold — Bootstrap & Orchestrator

Ponto de entrada inicial para criar projetos SaaS full-stack do zero com Next.js 14+ (App Router), Supabase, shadcn/ui e compatibilidade Lovable.

---

## Módulos de Scaffolding

Leia APENAS o módulo necessário para a etapa atual:

| Módulo | Arquivo | Finalidade | Skill Especializado Relacionado |
|---|---|---|---|
| **01. Setup Inicial** | `references/01-project-setup.md` | Criação do projeto Next.js + deps base | `saas-scaffold` |
| **02. Estrutura de Pastas** | `references/02-folder-structure.md` | Árvore canônica de diretórios | `backend-patterns`, `database` |
| **03. Compatibilidade Lovable** | `references/03-lovable-compat.md` | Contrato da pasta `lovable/` | `ui-components`, `github-ops` |
| **04. Conexão Supabase** | `references/04-supabase-init.md` | Clientes SSR + schema base | `database`, `auth` |
| **05. Setup shadcn/ui** | `references/05-shadcn-setup.md` | Design tokens Zinc-950 + CLI | `ui-components`, `ui-motion` |
| **06. Variáveis de Ambiente** | `references/06-env-vars.md` | Configuração de `.env.local` e `.env.example` | `deploy-production`, `github-ops` |
| **07. Checklist de Lançamento** | `references/07-launch-checklist.md` | Validação pré-deploy | `deploy-production` |

---

## Ecossistema de Skills Modulares

Quando o projeto estiver inicializado, delegue tarefas aprofundadas aos skills especializados:

1. **`database`**: DDL de esquemas multi-tenant (`profiles`, `organizations`, `subscriptions`, `audit_logs`), políticas RLS e migrações.
2. **`auth`**: Fluxos completos `@supabase/ssr` (OAuth PKCE, Magic Links, Reset de Senha, middleware de proteção de rotas).
3. **`backend-patterns`**: Server Actions tipadas com `ActionResult<T>`, validação Zod e cache invalidation (`revalidateTag`).
4. **`ui-components`**: Blocos prontos shadcn/ui (Dashboard Shell, Data Table, Formulários multi-step, Landing Page).
5. **`ui-motion`**: Micro-interações e animações (Border Beam, Shine Border, Shimmer Button, Number Ticker).
6. **`deploy-production`**: 4 camadas de cache App Router, SEO metadata suite, CSP headers e runbook de lançamento.
7. **`github-ops`**: Operações Git e GitHub CLI headless (PAT auth, branches, PRs automáticos e conventional commits).
