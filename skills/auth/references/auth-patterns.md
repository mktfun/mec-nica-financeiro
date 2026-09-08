# Complete Supabase Auth & Route Protection Patterns

Padrões de implementação prontos para produção em Next.js 14+ App Router utilizando `@supabase/ssr`. Inclui fábricas de clientes para todos os contextos, middleware de proteção com refresh automático, fluxos completos de Email/Senha, OAuth com PKCE, Magic Links, recuperação de senha e hook/provider React.

---

## 1. Fábricas de Clientes Supabase

### 1.1 Cliente do Navegador (Browser Client)
Utilizado exclusivamente em Client Components para inicializar provedores OAuth ou escutar mudanças de estado de autenticação.

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

### 1.2 Cliente do Servidor (Server Components & Server Actions)
Utilizado em Server Components, Server Actions e Route Handlers para acessar dados respeitando as políticas de RLS do usuário autenticado.

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
            // Chamado a partir de Server Component (read-only): mutações de cookies
            // são delegadas ao Middleware ou a Server Actions.
          }
        },
      },
    }
  )
}
```

---

### 1.3 Cliente Administrativo (Admin Service Role Client)
Utilizado exclusivamente em jobs do servidor, webhooks de terceiros (ex: Stripe) ou rotas privilegiadas. **Bypassa RLS**.

```typescript
// src/lib/supabase/admin.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
```

---

## 2. Middleware de Proteção de Rotas & Refresh de Token

O middleware intercepta cada requisição, renova os tokens de autenticação expirados sincronizando cookies entre request e response, e protege rotas privadas.

### 2.1 Helper de Atualização de Sessão
```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // OBRIGATÓRIO: Validar usuário com getUser(), NUNCA getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 1. Regra para rotas protegidas: requer autenticação
  const isProtectedRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/settings') || 
                           pathname.startsWith('/org')

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // 2. Regra para rotas públicas de auth: redirecionar se já logado
  const isAuthRoute = pathname === '/login' || 
                      pathname === '/signup' || 
                      pathname === '/forgot-password'

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

---

### 2.2 Arquivo `middleware.ts` na Raiz
```typescript
// src/middleware.ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 3. Autenticação Email & Senha (Server Actions)

```typescript
// src/app/actions/auth-actions.ts
'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type AuthActionResult = {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

const signInSchema = z.object({
  email: z.string().email('Endereço de e-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Endereço de e-mail inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
})

export async function signInWithPasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = signInSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados de login inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return {
      success: false,
      error: error.message === 'Invalid login credentials' 
        ? 'E-mail ou senha incorretos' 
        : error.message,
    }
  }

  const redirectTo = (formData.get('redirectTo') as string) || '/dashboard'
  redirect(redirectTo)
}

export async function signUpWithPasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const rawData = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = signUpSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados de cadastro inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  })

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  // Se a confirmação de e-mail estiver habilitada, notificar o usuário
  if (data.user && !data.session) {
    return {
      success: true,
      error: 'Enviamos um link de confirmação para o seu e-mail.',
    }
  }

  redirect('/dashboard')
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

---

## 4. OAuth Providers (Google, GitHub) com PKCE

### 4.1 Trigger no Client Component
```typescript
// src/components/auth/oauth-buttons.tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function OAuthButtons() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      setLoadingProvider(provider)
      const supabase = createClient()
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      })

      if (error) throw error
    } catch (err) {
      console.error('OAuth error:', err)
      setLoadingProvider(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <button
        type="button"
        disabled={!!loadingProvider}
        onClick={() => handleOAuthLogin('google')}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
      >
        Continuar com Google
      </button>
      <button
        type="button"
        disabled={!!loadingProvider}
        onClick={() => handleOAuthLogin('github')}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
      >
        Continuar com GitHub
      </button>
    </div>
  )
}
```

---

### 4.2 Route Handler de Callback PKCE (`/auth/callback`)
```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const isRelativeUrl = next.startsWith('/') && !next.startsWith('//')
      const targetUrl = isRelativeUrl ? `${requestUrl.origin}${next}` : `${requestUrl.origin}/dashboard`
      return NextResponse.redirect(targetUrl)
    }
  }

  // Redirecionar para página de erro ou login com mensagem
  return NextResponse.redirect(`${requestUrl.origin}/login?error=Falha+na+autenticação`)
}
```

---

## 5. Magic Link (Passwordless) & Recuperação de Senha

### 5.1 Magic Link Action
```typescript
// src/app/actions/magic-link-actions.ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import type { AuthActionResult } from './auth-actions'

const magicLinkSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

export async function signInWithMagicLinkAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email')
  const parsed = magicLinkSchema.safeParse({ email })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Informe um e-mail válido',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const headersList = await headers()
  const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      shouldCreateUser: true,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    error: 'Link de acesso enviado com sucesso para o seu e-mail.',
  }
}
```

---

### 5.2 Fluxo de Reset de Senha (3 Passos)

```typescript
// src/app/actions/reset-password-actions.ts
'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import type { AuthActionResult } from './auth-actions'

// Passo 1: Solicitar link de redefinição
export async function requestPasswordResetAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email')
  if (!email || typeof email !== 'string') {
    return { success: false, error: 'E-mail é obrigatório' }
  }

  const headersList = await headers()
  const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    error: 'Instruções de redefinição enviadas para seu e-mail.',
  }
}

// Passo 3: Atualizar senha após troca do token no callback
const updatePasswordSchema = z.object({
  password: z.string().min(8, 'A nova senha deve ter no mínimo 8 caracteres'),
})

export async function updatePasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get('password')
  const parsed = updatePasswordSchema.safeParse({ password })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Senha inválida',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  redirect('/dashboard')
}
```

---

## 6. React Auth Provider & Hook (`useUser`)

```typescript
// src/components/providers/auth-provider.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: async () => {},
})

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: User | null
}) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [isLoading, setIsLoading] = useState<boolean>(!initialUser)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)

      if (event === 'SIGNED_OUT') {
        router.push('/login')
        router.refresh()
      } else if (event === 'SIGNED_IN') {
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
    router.refresh()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useUser deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
```
