# 04 — Supabase: Inicialização e Clientes SSR

Para arquitetura de autenticação aprofundada, consulte `auth/SKILL.md`. Para DDL de schemas completos e políticas de Row Level Security (RLS), consulte `database/SKILL.md`.

---

## 1. Arquivos de Clientes SSR (`src/lib/supabase/`)

### `src/lib/supabase/client.ts` — Client-side (Browser)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `src/lib/supabase/server.ts` — Server-side (Server Components & Server Actions)
```typescript
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
            // Em Server Components pura leitura, setAll pode ser ignorado
          }
        },
      },
    }
  )
}
```

### `middleware.ts` (Raiz do Projeto) — Atualização de Sessão & Proteção de Rotas
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Atualiza sessão expirada e obtém usuário autenticado
  const { data: { user } } = await supabase.auth.getUser()

  // Proteger rotas autenticadas (/dashboard/*)
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirecionar usuário autenticado para dashboard ao acessar login/signup
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 2. Schema Inicial de Perfis (`supabase/migrations/20260901000001_initial_schema.sql`)

```sql
-- Extensão para geração de UUID
create extension if not exists "uuid-ossp";

-- Tabela de perfis sincronizada com auth.users
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ativação de RLS
alter table public.profiles enable row level security;

-- Políticas RLS básicas
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger de criação de perfil automática no cadastro
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## 3. Próximos Passos Especializados

- Para esquemas multi-tenant (`organizations`, `subscriptions`, `audit_logs`), consulte `database/references/schema-patterns.md`.
- Para regras avançadas de isolamento RLS, consulte `database/references/rls-patterns.md`.
- Para autenticação OAuth, Magic Link e rotas de callback, consulte `auth/references/auth-patterns.md`.
