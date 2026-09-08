---
name: afrexai-nextjs-production
description: Checklist e padrões de produção para Next.js — App Router, performance, SEO, segurança e deploy no contexto Lovable + Supabase self-hosted.
---

# Next.js Production — Guia Operacional para IA

## Stack e Versões do Projeto

- **Next.js**: App Router (app/ directory) — nunca pages/
- **React**: Server Components por padrão, Client Components apenas quando necessário
- **Auth**: `@supabase/ssr` com cookies (nunca localStorage para auth)
- **Deploy**: Lovable (frontend) com Supabase self-hosted na VPS

## 1. Server vs Client Components

**Server Component** (default, sem `'use client'`):
- Fetch de dados, acesso a DB, leitura de env vars server-only
- Não tem: hooks (`useState`, `useEffect`), event listeners, browser APIs

**Client Component** (`'use client'` no topo):
- Interatividade: `useState`, `useEffect`, `onClick`, forms
- Importar o mínimo possível para reduzir bundle

**Regra**: Empurre o `'use client'` o mais "abaixo" na árvore possível.

```tsx
// ✅ Correto: wrapper server, só o interativo é client
// app/page.tsx (Server Component)
import { InterativeButton } from './InterativeButton'
export default async function Page() {
  const data = await fetchData() // roda no servidor
  return <InterativeButton initialData={data} />
}

// InterativeButton.tsx
'use client'
export function InterativeButton({ initialData }) {
  const [state, setState] = useState(initialData)
  // ...
}
```

## 2. Fetch e Cache

```typescript
// Revalidar a cada 60 segundos
const data = await fetch('/api/dados', { next: { revalidate: 60 } })

// Sem cache (dados em tempo real)
const data = await fetch('/api/dados', { cache: 'no-store' })

// Revalidar por tag
const data = await fetch('/api/dados', { next: { tags: ['transacoes'] } })
// Para revalidar: revalidateTag('transacoes')
```

## 3. Variáveis de Ambiente

```bash
# .env.local (nunca commitar)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co        # exposto ao browser
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>                   # exposto ao browser
SUPABASE_SERVICE_ROLE_KEY=<service-role>                   # SOMENTE server
SUPABASE_PROJECT_ID=<ref>                                  # SOMENTE server
```

**Regra**: `NEXT_PUBLIC_*` → acessível no browser. Nunca coloque service_role nessas.

## 4. Metadata e SEO

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: { template: '%s | App Nome', default: 'App Nome' },
  description: 'Descrição da aplicação',
  robots: { index: false } // para apps privados/autenticados
}

// app/pagina/page.tsx
export const metadata: Metadata = {
  title: 'Nome da Página'
}
```

## 5. Error Boundaries

```tsx
// app/error.tsx — captura erros em runtime
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-red-400">Algo deu errado: {error.message}</p>
      <button onClick={reset} className="btn-primary">Tentar novamente</button>
    </div>
  )
}

// app/not-found.tsx — 404
export default function NotFound() {
  return <div>Página não encontrada</div>
}
```

## 6. Checklist de Produção

- [ ] Nenhum `console.log` de dados sensíveis no código
- [ ] Todas as env vars necessárias documentadas
- [ ] Error boundary implementado (`error.tsx`)
- [ ] Loading state implementado (`loading.tsx`)
- [ ] Metadata definida em todas as rotas públicas
- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca em variável `NEXT_PUBLIC_*`
- [ ] Nenhuma query de banco exposta ao cliente sem RLS
- [ ] Build local passa sem erros: `npm run build`

## 7. Comandos do Projeto (Windows/PowerShell)

```powershell
# Instalar dependências
cmd.exe /c "npm install"

# Dev server
cmd.exe /c "npm run dev"

# Build de produção
cmd.exe /c "npm run build"

# Type check
cmd.exe /c "npx tsc --noEmit"
```

> Usar sempre `cmd.exe /c` para evitar problemas de Execution Policy com `.ps1`

## 8. Anti-Patterns Next.js

| ❌ Proibido | ✅ Correto |
|---|---|
| `getSession()` em Server Component | `getUser()` — valida com servidor |
| `localStorage` para armazenar token | Cookies httpOnly via `@supabase/ssr` |
| `'use client'` no layout raiz | Server Component no layout, Client apenas onde necessário |
| `fetch` sem cache strategy | Definir explicitamente `revalidate` ou `cache: 'no-store'` |
| `any` em tipos | Tipar explicitamente, usar `unknown` se necessário |
| Dados sensíveis em `NEXT_PUBLIC_*` | Apenas em variáveis server-only |
