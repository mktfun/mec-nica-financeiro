# Next.js Server Actions & Webhook Templates

Templates de produção para Server Actions no Next.js 14+ App Router, mutações CRUD com validação Zod e RLS, UI otimista com React hooks (`useOptimistic`, `useTransition`), estratégias de revalidação de cache (`revalidateTag`, `revalidatePath`) e Webhook de billing Stripe.

---

## 1. Tipagem & Helper de Execução Segura

```typescript
// src/types/actions.ts
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

export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

---

## 2. Templates Canônicos de CRUD (Server Actions)

```typescript
// src/app/actions/project-actions.ts
'use server'

import { z } from 'zod'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, PaginatedResult, PaginationParams } from '@/types/actions'

export interface Project {
  id: string
  org_id: string
  name: string
  description: string | null
  status: 'active' | 'archived' | 'draft'
  created_by: string
  created_at: string
  updated_at: string
}

// ----------------------------------------------------------------------------
// 2.1 CREATE: Criar Projeto
// ----------------------------------------------------------------------------
const createProjectSchema = z.object({
  orgId: z.string().uuid('ID de organização inválido'),
  name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres').max(100),
  description: z.string().max(500).optional(),
})

export async function createProjectAction(
  formData: FormData
): Promise<ActionResult<Project>> {
  try {
    const rawData = {
      orgId: formData.get('orgId'),
      name: formData.get('name'),
      description: formData.get('description') || undefined,
    }

    const parsed = createProjectSchema.safeParse(rawData)
    if (!parsed.success) {
      return {
        success: false,
        error: 'Preencha todos os campos obrigatórios corretamente',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Sessão expirada. Faça login novamente.' }
    }

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        org_id: parsed.data.orgId,
        name: parsed.data.name,
        description: parsed.data.description,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    // Invalidação de cache granular
    revalidateTag(`org-${parsed.data.orgId}-projects`)
    revalidatePath('/dashboard/projects')

    return { success: true, data: project as Project }
  } catch (err) {
    console.error('[createProjectAction] Exception:', err)
    return { success: false, error: 'Ocorreu um erro ao processar sua solicitação.' }
  }
}

// ----------------------------------------------------------------------------
// 2.2 READ: Listagem Paginada com Filtros e Busca
// ----------------------------------------------------------------------------
export async function getProjectsAction(
  orgId: string,
  params: PaginationParams = {}
): Promise<ActionResult<PaginatedResult<Project>>> {
  try {
    const page = Math.max(1, params.page || 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 10))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)

    if (params.search && params.search.trim() !== '') {
      query = query.ilike('name', `%${params.search.trim()}%`)
    }

    const sortBy = params.sortBy || 'created_at'
    const ascending = params.sortOrder === 'asc'
    query = query.order(sortBy, { ascending }).range(from, to)

    const { data, count, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    return {
      success: true,
      data: {
        items: (data as Project[]) || [],
        total,
        page,
        pageSize,
        totalPages,
      },
    }
  } catch (err) {
    console.error('[getProjectsAction] Exception:', err)
    return { success: false, error: 'Erro ao consultar projetos.' }
  }
}

// ----------------------------------------------------------------------------
// 2.3 UPDATE: Atualizar Projeto
// ----------------------------------------------------------------------------
const updateProjectSchema = z.object({
  id: z.string().uuid('ID do projeto inválido'),
  orgId: z.string().uuid('ID da organização inválido'),
  name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres').max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
})

export async function updateProjectAction(
  formData: FormData
): Promise<ActionResult<Project>> {
  try {
    const rawData = {
      id: formData.get('id'),
      orgId: formData.get('orgId'),
      name: formData.get('name') || undefined,
      description: formData.get('description') || undefined,
      status: formData.get('status') || undefined,
    }

    const parsed = updateProjectSchema.safeParse(rawData)
    if (!parsed.success) {
      return {
        success: false,
        error: 'Dados de atualização inválidos',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const updatePayload: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description
    if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status

    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update(updatePayload)
      .eq('id', parsed.data.id)
      .eq('org_id', parsed.data.orgId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidateTag(`org-${parsed.data.orgId}-projects`)
    revalidatePath('/dashboard/projects')

    return { success: true, data: updatedProject as Project }
  } catch (err) {
    console.error('[updateProjectAction] Exception:', err)
    return { success: false, error: 'Erro ao atualizar projeto.' }
  }
}

// ----------------------------------------------------------------------------
// 2.4 DELETE: Exclusão de Projeto (Hard ou Soft Delete)
// ----------------------------------------------------------------------------
const deleteProjectSchema = z.object({
  id: z.string().uuid('ID inválido'),
  orgId: z.string().uuid('ID de organização inválido'),
})

export async function deleteProjectAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const rawData = {
      id: formData.get('id'),
      orgId: formData.get('orgId'),
    }

    const parsed = deleteProjectSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: 'Identificadores inválidos' }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', parsed.data.id)
      .eq('org_id', parsed.data.orgId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidateTag(`org-${parsed.data.orgId}-projects`)
    revalidatePath('/dashboard/projects')

    return { success: true, data: { id: parsed.data.id } }
  } catch (err) {
    console.error('[deleteProjectAction] Exception:', err)
    return { success: false, error: 'Erro ao deletar projeto.' }
  }
}
```

---

## 3. UI Otimista em React (`useOptimistic` + `useTransition`)

Componente de interface que atualiza o estado local instantaneamente enquanto a Server Action executa em background, revertendo automaticamente em caso de falha.

```typescript
// src/components/dashboard/projects-optimistic-list.tsx
'use client'

import React, { useOptimistic, useTransition, useState } from 'react'
import { createProjectAction, deleteProjectAction, type Project } from '@/app/actions/project-actions'

interface ProjectsListProps {
  initialProjects: Project[]
  orgId: string
}

type OptimisticAction =
  | { type: 'ADD'; project: Project }
  | { type: 'DELETE'; id: string }

export function ProjectsOptimisticList({ initialProjects, orgId }: ProjectsListProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [optimisticProjects, setOptimisticProjects] = useOptimistic(
    projects,
    (state: Project[], action: OptimisticAction) => {
      switch (action.type) {
        case 'ADD':
          return [action.project, ...state]
        case 'DELETE':
          return state.filter((p) => p.id !== action.id)
        default:
          return state
      }
    }
  )

  const handleCreate = async (formData: FormData) => {
    setErrorMsg(null)
    const name = formData.get('name') as string
    if (!name) return

    const tempProject: Project = {
      id: `temp-${Date.now()}`,
      org_id: orgId,
      name,
      description: (formData.get('description') as string) || null,
      status: 'active',
      created_by: 'current-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    startTransition(async () => {
      setOptimisticProjects({ type: 'ADD', project: tempProject })
      formData.set('orgId', orgId)
      const result = await createProjectAction(formData)

      if (!result.success) {
        setErrorMsg(result.error)
      } else {
        setProjects((prev) => [result.data, ...prev])
      }
    })
  }

  const handleDelete = async (id: string) => {
    setErrorMsg(null)
    startTransition(async () => {
      setOptimisticProjects({ type: 'DELETE', id })
      const formData = new FormData()
      formData.set('id', id)
      formData.set('orgId', orgId)

      const result = await deleteProjectAction(formData)
      if (!result.success) {
        setErrorMsg(result.error)
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== id))
      }
    })
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3 bg-red-950/50 border border-red-800 text-red-200 text-sm rounded-lg">
          {errorMsg}
        </div>
      )}

      {/* Formulário de Criação Rápida */}
      <form action={handleCreate} className="flex gap-2">
        <input
          name="name"
          placeholder="Nome do novo projeto..."
          required
          disabled={isPending}
          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Adicionar'}
        </button>
      </form>

      {/* Lista Otimista */}
      <ul className="divide-y divide-zinc-800 border border-zinc-800 rounded-lg bg-zinc-950">
        {optimisticProjects.length === 0 ? (
          <li className="p-4 text-center text-zinc-500 text-sm">Nenhum projeto encontrado.</li>
        ) : (
          optimisticProjects.map((project) => (
            <li key={project.id} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-zinc-100 text-sm">{project.name}</h4>
                {project.description && (
                  <p className="text-xs text-zinc-400">{project.description}</p>
                )}
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(project.id)}
                className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
              >
                Excluir
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
```

---

## 4. Webhook de Billing Stripe (`/api/webhooks/stripe`)

Route Handler com verificação criptográfica de assinatura de webhook e sincronização de assinaturas na tabela `subscriptions` via Supabase Admin Client.

```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Assinatura ou chave secreta de webhook ausente' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error(`[Stripe Webhook] Falha de verificação de assinatura: ${message}`)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id

          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId)
          const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
          const orgId = session.client_reference_id || session.metadata?.orgId

          if (customerId && orgId) {
            await supabaseAdmin.from('subscriptions').upsert(
              {
                org_id: orgId,
                stripe_customer_id: customerId,
                stripe_subscription_id: stripeSub.id,
                status: stripeSub.status,
                price_id: stripeSub.items.data[0]?.price.id,
                plan_id: session.metadata?.planId || 'pro',
                quantity: stripeSub.items.data[0]?.quantity || 1,
                cancel_at_period_end: stripeSub.cancel_at_period_end,
                current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
                current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
                trial_start: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000).toISOString() : null,
                trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
              },
              { onConflict: 'stripe_customer_id' }
            )
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: sub.status,
            price_id: sub.items.data[0]?.price.id,
            quantity: sub.items.data[0]?.quantity || 1,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      default:
        // Evento ignorado
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    console.error(`[Stripe Webhook] Erro ao processar evento ${event.type}:`, message)
    return NextResponse.json({ error: 'Falha ao processar webhook' }, { status: 500 })
  }
}
```
