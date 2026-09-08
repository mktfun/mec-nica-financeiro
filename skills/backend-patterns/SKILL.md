---
name: backend-patterns
description: Padrões backend de alta produtividade — Server Actions tipadas (ActionResult<T>), validação com Zod, mutações CRUD, UI otimista, revalidação de cache e Edge Functions.
triggers: [backend, server action, action, crud, zod, optimistic ui, revalidateTag, edge function, webhook, api route]
---

# Next.js Server Actions & Backend Architecture Guide

Guia de engenharia para desenvolvimento de APIs e Server Actions no Next.js 14+ App Router com validação Zod, contratos tipados, invalidação granular de cache e Supabase.

---

## 1. Contrato Padronizado de Resposta (`ActionResult<T>`)

Toda Server Action deve retornar uma união discriminada tipada, garantindo previsibilidade total no frontend:

```typescript
export type ActionResult<T = void> =
  | {
      success: true
      data: T
      error?: never
      fieldErrors?: never
    }
  | {
      success: false
      error: string
      fieldErrors?: Record<string, string[]>
      data?: never
    }
```

---

## 2. Pipeline de Execução & Segurança Obrigatória

Server Actions são endpoints POST públicos gerados dinamicamente. Cada ação **DEVE** seguir a sequência de 5 passos:

```
[Requisição] ──► 1. Autenticar (getUser) ──► 2. Validar Input (Zod) ──► 3. Autorizar Tenant ──► 4. Executar DB ──► 5. Revalidar Cache ──► [ActionResult]
```

### Checklist de Segurança
1. **Autenticação Real**: `const { data: { user } } = await supabase.auth.getUser()`. Jamais confie em `user_id` enviado pelo formulário.
2. **Validação Zod**: `schema.safeParse(rawData)`. Sempre trate falhas retornando `fieldErrors`.
3. **Escopo de Tenant**: Verifique se o usuário pertence à organização (`org_id`) antes de mutações.
4. **Tratamento de Erros Amigável**: Capture exceções internas e retorne mensagens legíveis, nunca stack traces.

---

## 3. Invalidação de Cache no App Router

Escolha a estratégia adequada de revalidação de cache após mutações:

| Método | Escopo | Uso Recomendado |
| :--- | :--- | :--- |
| `revalidateTag('org-${id}-projects')` | Granular por Entidade/Tenant | Mutações de listas compartilhadas entre páginas |
| `revalidatePath('/dashboard/projects')` | Página Específica | Atualização da rota corrente após formulário |
| `revalidatePath('/', 'layout')` | Aplicação Inteira | Mudança estrutural (troca de tenant / logout) |

---

## 4. Server Actions vs Edge Functions vs Route Handlers

| Critério | Server Actions | Edge Functions | Route Handlers |
| :--- | :--- | :--- | :--- |
| **Caso de Uso Principal** | Mutações de UI e formulários | Jobs assíncronos pesados / Cron | Webhooks de terceiros e callbacks |
| **Local de Execução** | Next.js Server / Node.js runtime | Deno Edge Runtime (Supabase) | Next.js API Routes |
| **Integração com UI** | Nativa com `useActionState` / `useOptimistic` | Requisição HTTP `fetch` manual | Requisição HTTP `fetch` manual |
| **Controle de Cache** | `revalidateTag` direto | Indireto | `revalidateTag` via cabeçalhos |

---

## 5. Exemplo Canônico de Server Action

```typescript
'use server'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/actions'

const createItemSchema = z.object({
  orgId: z.string().uuid('ID de organização inválido'),
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres').max(100),
})

export async function createItemAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const raw = { orgId: formData.get('orgId'), title: formData.get('title') }
    const parsed = createItemSchema.safeParse(raw)

    if (!parsed.success) {
      return {
        success: false,
        error: 'Dados inválidos',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado' }

    const { data, error } = await supabase
      .from('items')
      .insert({ org_id: parsed.data.orgId, title: parsed.data.title, created_by: user.id })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    revalidateTag(`org-${parsed.data.orgId}-items`)
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: 'Erro inesperado no servidor' }
  }
}
```

---

## 6. Referência Modular do Ecossistema

Para templates completos e prontos para produção:
- **`references/server-action-templates.md`**: CRUD completo (Create, Read paginado, Update, Soft/Hard Delete), UI Otimista com `useOptimistic` e `useTransition`, e Webhook completo do Stripe com validação de assinatura e sincronização de assinaturas.
