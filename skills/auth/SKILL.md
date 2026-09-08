---
name: auth
description: Autenticação completa e proteção de rotas com Supabase Auth e @supabase/ssr — HTTP-only cookies, Server Components, Server Actions, Route Handlers, OAuth PKCE, Magic Link, Reset de senha e Middleware.
triggers: [auth, login, signup, oauth, magic link, password reset, session, middleware auth, protected routes, @supabase/ssr]
---

# Supabase SSR Authentication & Route Protection Guide

Guia de engenharia para autenticação robusta no Next.js 14+ App Router utilizando `@supabase/ssr` e cookies HTTP-only seguros.

---

## 1. Arquitetura `@supabase/ssr` & Ciclo de Cookies

O Next.js App Router executa código em 4 contextos distintos. Cada contexto gerencia cookies de forma específica:

| Contexto | Método de Criação | Capacidade de Cookies | Função Principal |
| :--- | :--- | :--- | :--- |
| **Server Components** | `createServerClient` | Read-only | Buscar dados com RLS baseado no usuário autenticado |
| **Server Actions** | `createServerClient` | Read & Write | Mutação de dados, login, signup, logout |
| **Route Handlers** | `createServerClient` | Read & Write | Callbacks OAuth (`/auth/callback`), Webhooks |
| **Middleware** | `createServerClient` | Sync Request/Response | Atualizar sessão JWT, proteger rotas `/dashboard/*` |
| **Browser Client** | `createBrowserClient` | Browser API | Iniciar login OAuth, escutar `onAuthStateChange` |

---

## 2. Regras Críticas de Segurança

### 1. `getUser()` vs `getSession()`
- **NO SERVIDOR**: Utilize **SEMPRE** `await supabase.auth.getUser()`. Essa chamada valida o token criptograficamente junto aos servidores do Supabase.
- **NUNCA** use `supabase.auth.getSession()` no servidor para autorização ou verificação de identidade, pois ela apenas lê o payload do cookie sem validar se o token foi revogado ou adulterado.

### 2. Cookies HTTP-only vs LocalStorage
- Armazene tokens de sessão exclusivamente em cookies HTTP-only, `SameSite=Lax`, `Secure` (em produção).
- **JAMAIS** salve JWTs no `localStorage` ou `sessionStorage` do navegador, eliminando o risco de exfiltração via XSS.

### 3. Isolamento da Service Role Key
- `SUPABASE_SERVICE_ROLE_KEY` tem privilégio de superusuário e bypassa RLS.
- Use-a apenas em webhooks confiáveis (ex: Stripe) ou scripts de administração do servidor.
- **NUNCA** use o prefixo `NEXT_PUBLIC_` na Service Role Key.

### 4. Fluxo PKCE Obrigatório
- Todos os fluxos OAuth (Google, GitHub) e Magic Links devem usar o padrão PKCE (*Proof Key for Code Exchange*), redirecionando para um Route Handler `/auth/callback` que troca o `code` temporário por uma sessão segura.

---

## 3. Padrão Rápido de Fábricas de Cliente

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Chamado a partir de Server Component: mutações de cookies são ignoradas aqui
          }
        },
      },
    }
  )
}
```

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## 4. Referência Modular do Ecossistema

Para implementações completas e verificadas:
- **`references/auth-patterns.md`**: Implementações completas de Middleware de proteção com refresh automático, Server Actions de login/signup/reset, OAuth PKCE callback `/auth/callback`, Magic Link, e Auth Provider em React.
