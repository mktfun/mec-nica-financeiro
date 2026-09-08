---
name: backend
description: Guia de desenvolvimento backend para o projeto — padrões de API, validação, segurança, tratamento de erros e integração com Supabase no contexto Next.js/Edge Functions.
---

# Backend — Guia Operacional para IA

## Stack Backend do Projeto

- **Banco de dados**: Supabase (PostgreSQL) — ver skill `supabase` para operações de DB
- **Funções servidor**: Next.js Server Actions ou Supabase Edge Functions
- **Autenticação**: Supabase Auth com JWT
- **Ambiente**: Windows / PowerShell — ver regras de CLI no `ia.md`

## 1. Server Actions (Next.js App Router)

**Padrão obrigatório para toda Server Action:**

```typescript
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function minhaAction(formData: FormData) {
  // 1. Criar client autenticado
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // 2. Validar usuário SEMPRE antes de qualquer operação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return { error: 'Não autenticado' }
  }

  // 3. Validar inputs antes de qualquer query
  const valor = formData.get('valor')
  if (!valor || typeof valor !== 'string') {
    return { error: 'Campo obrigatório' }
  }

  // 4. Executar operação
  const { data, error } = await supabase
    .from('minha_tabela')
    .insert({ user_id: user.id, valor })
    .select()
    .single()

  if (error) {
    console.error('[minhaAction] Erro:', error)
    return { error: error.message }
  }

  return { data }
}
```

## 2. Edge Functions (Supabase)

**Padrão obrigatório:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validar JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Client autenticado com o token do usuário (respeita RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Para operações privilegiadas que precisam bypassar RLS:
    // const adminClient = createClient(
    //   Deno.env.get('SUPABASE_URL')!,
    //   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não encontrado')

    const body = await req.json()
    // ... lógica aqui

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

## 3. Regras de Segurança Backend

- **Sempre validar JWT**: nunca confie no `user_id` vindo do body da requisição — use `supabase.auth.getUser()`
- **Nunca expor service_role key no frontend**: apenas em Server Actions, Edge Functions ou scripts de migração
- **Sanitize inputs antes de qualquer query**: nunca interpolar strings diretamente em SQL
- **Retorne erros amigáveis**: nunca exponha stack traces ou mensagens de erro internas ao frontend
- **Sempre tipar o retorno**: use TypeScript generics nas queries Supabase

## 4. Tratamento de Erros

**Padrão de retorno consistente para Server Actions:**
```typescript
type ActionResult<T> = 
  | { data: T; error?: never }
  | { data?: never; error: string }
```

**No frontend, tratar sempre:**
```typescript
const result = await minhaAction(formData)
if (result.error) {
  toast.error(result.error)
  return
}
// usar result.data com segurança
```

## 5. Anti-Patterns

| ❌ Proibido | ✅ Correto |
|---|---|
| `getSession()` no server para validar user | `getUser()` — verifica com o servidor |
| Inserir `user_id` vindo do body | Pegar do `user.id` retornado pelo JWT |
| Expor stack trace no response | Logar internamente, retornar mensagem genérica |
| Query sem tratamento de erro | Sempre checar `if (error)` antes de usar `data` |
| Service role key em variável `NEXT_PUBLIC_*` | Apenas em variáveis server-only (sem `NEXT_PUBLIC_`) |
