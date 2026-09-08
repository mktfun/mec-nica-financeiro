# 02 — Estrutura de Pastas Padrão

## Árvore Canônica SaaS (Next.js App Router)

```
nome-do-projeto/
│
├── src/
│   ├── app/                          ← Rotas & Páginas (App Router)
│   │   ├── (auth)/                   ← Rotas públicas (login, signup, callback)
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── auth/callback/route.ts ← Ver auth/references/auth-patterns.md
│   │   ├── (dashboard)/              ← Rotas autenticadas e protegidas
│   │   │   ├── layout.tsx            ← Shell do dashboard (ver ui-components)
│   │   │   ├── page.tsx              ← Visão geral / métricas
│   │   │   ├── settings/page.tsx
│   │   │   └── [feature]/page.tsx
│   │   ├── api/                      ← Route Handlers (webhooks externos)
│   │   │   └── webhooks/stripe/route.ts
│   │   ├── layout.tsx                ← Root Layout (SEO metadata e providers)
│   │   ├── page.tsx                  ← Landing page (ver ui-components/references/landing-page.md)
│   │   ├── error.tsx                 ← Error boundary global
│   │   ├── not-found.tsx             ← Página 404
│   │   ├── loading.tsx               ← Skeleton de carregamento global
│   │   ├── sitemap.ts                ← Dynamic sitemap (ver deploy-production)
│   │   └── robots.ts                 ← Dynamic robots (ver deploy-production)
│   │
│   ├── components/
│   │   ├── ui/                       ← Primitivos shadcn/ui gerados pelo CLI
│   │   │   ├── button.tsx, card.tsx, dialog.tsx, table.tsx, ...
│   │   ├── layout/                   ← Componentes estruturais (Sidebar, Header, Nav)
│   │   │   ├── app-sidebar.tsx       ← Ver ui-components/references/dashboard-layout.md
│   │   │   ├── app-header.tsx
│   │   │   └── user-nav.tsx
│   │   ├── motion/                   ← Micro-interações (ver ui-motion/SKILL.md)
│   │   │   ├── border-beam.tsx, shimmer-button.tsx, number-ticker.tsx
│   │   └── features/                 ← Componentes de domínio e formulários
│   │       ├── data-table/           ← Ver ui-components/references/data-table.md
│   │       └── forms/                ← Ver ui-components/references/forms.md
│   │
│   ├── lib/
│   │   ├── supabase/                 ← Clientes SSR (ver auth/SKILL.md)
│   │   │   ├── client.ts             ← Client-side browser client
│   │   │   ├── server.ts             ← Server-side async client
│   │   │   └── middleware.ts         ← Sessão e refresh de cookies
│   │   ├── validations/              ← Schemas Zod de validação
│   │   │   ├── auth.ts
│   │   │   └── [feature].ts
│   │   └── utils.ts                  ← Utilitário cn (clsx + twMerge)
│   │
│   ├── actions/                      ← Server Actions (ver backend-patterns/SKILL.md)
│   │   ├── auth.ts                   ← Login, logout, cadastro
│   │   └── [feature].ts              ← Mutações com ActionResult<T> e revalidateTag
│   │
│   ├── hooks/                        ← Custom React Hooks client-side
│   │   └── use-[feature].ts
│   │
│   └── types/                        ← Interfaces TypeScript
│       ├── database.ts               ← Tipos gerados pelo Supabase CLI
│       ├── action-result.ts          ← Tipo ActionResult<T> (ver backend-patterns)
│       └── index.ts
│
├── public/                           ← Assets estáticos, ícones e og-image.png
├── lovable/                          ← Especificações Lovable (ver references/03-lovable-compat.md)
│   ├── PROJECT.md, DESIGN.md, COMPONENTS.md
├── supabase/                         ← Configurações Supabase (ver database/SKILL.md)
│   ├── migrations/                   ← Migrações DDL e RLS versionadas
│   │   └── 20260901000001_initial_schema.sql
│   └── config.toml
├── .env.local                        ← Variáveis de ambiente locais (NÃO commitar)
├── .env.example                      ← Template de variáveis (commitar)
├── middleware.ts                     ← Middleware Next.js com proteção de rotas SSR
├── next.config.mjs                   ← CSP security headers e standalone (ver deploy-production)
├── tailwind.config.ts                ← Tokens Zinc-950/Indigo (ver ui-components)
└── tsconfig.json
```

---

## Mapeamento de Responsabilidades com Skills

| Diretório | Responsabilidade | Skill Especializado |
|---|---|---|
| `src/app/` (rotas & layouts) | Roteamento, SSR/SSG, SEO | `deploy-production` |
| `src/components/ui/` & `layout/` | Shell, tabelas, forms, landing | `ui-components` |
| `src/components/motion/` | Animações, micro-interações | `ui-motion` |
| `src/actions/` | Mutações tipadas, validação Zod | `backend-patterns` |
| `src/lib/supabase/` & `middleware.ts` | Autenticação SSR, cookies | `auth` |
| `supabase/migrations/` | Schemas DDL, RLS multi-tenant | `database` |
| `.github/` & Git operations | Commits, PRs, automação | `github-ops` |
