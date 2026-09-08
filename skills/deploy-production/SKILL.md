---
name: deploy-production
description: Next.js App Router production readiness, 4-tier caching architecture, SEO metadata suite, CSP security headers, and Core Web Vitals guardrails.
triggers: [deploy, production, launch, release, seo, cache, revalidate, headers, security, vercel, vps, lovable]
---

# Next.js Production & Deployment Engine

Production standards for Next.js 14+ App Router, Supabase, SEO, CSP security, and multi-target deployments.

---

## 1. App Router 4-Tier Caching Architecture

Next.js operates four caching layers:

```
Request Memoization ──► Data Cache ──► Full Route Cache ──► Router Cache
 (React cache)           (fetch cache)  (Static HTML/RSC)  (Client memory)
```

### 1. Request Memoization (Per-Render Pass)
Deduplicates identical requests across component tree during single render:
```typescript
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export const getUserProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
})
```

### 2. Data Cache (Cross-Request Persistence)
- **ISR**: `fetch(url, { next: { revalidate: 3600 } })`
- **Tag-based**: `fetch(url, { next: { tags: ['org-data'] } })`
- **Dynamic**: `fetch(url, { cache: 'no-store' })`
- **Invalidation**: `revalidateTag('org-data')` or `revalidatePath('/dashboard')` in Server Actions.

```typescript
'use server'
import { revalidateTag, revalidatePath } from 'next/cache'

export async function mutateData(orgId: string) {
  revalidateTag(`org-${orgId}`)
  revalidatePath('/dashboard/settings')
}
```

### 3. Full Route Cache (Server Build/Render)
- **Static**: Pre-rendered at build time when no dynamic functions are used.
- **Dynamic**: Rendered per request when dynamic APIs (`cookies()`, `headers()`) are called.
```typescript
export const dynamic = 'force-dynamic' // Force on-demand render
export const revalidate = 0            // Invalidate route cache
```

### 4. Router Cache (Client-Side In-Memory)
Stores RSC payloads in browser memory. Invalidate via `router.refresh()` or Server Actions.

---

## 2. SEO Metadata Suite

### Root & Dynamic Metadata (`layout.tsx` / `[slug]/page.tsx`)
```typescript
// app/layout.tsx
import type { Metadata, Viewport } from 'next'
export const viewport: Viewport = { themeColor: '#09090b', width: 'device-width', initialScale: 1 }
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'),
  title: { template: '%s | SaaS App', default: 'SaaS App' },
  description: 'Enterprise full-stack SaaS platform.',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', url: '/', title: 'SaaS App', images: ['/og.png'] },
  robots: { index: true, follow: true },
}

// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { title: `Post: ${slug}`, openGraph: { images: [`/api/og?title=${encodeURIComponent(slug)}`] } }
}
```

### Dynamic Sitemap & Robots (`sitemap.ts` / `robots.ts`)
```typescript
import type { MetadataRoute } from 'next'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'
  return ['', '/pricing', '/login'].map((r) => ({ url: `${base}${r}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: r === '' ? 1 : 0.8 }))
}
export function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard/'] }], sitemap: `${base}/sitemap.xml` }
}
```

### JSON-LD Structured Data (`src/components/seo/json-ld.tsx`)
```tsx
export function JsonLdStructuredData() {
  const schema = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'SaaS Platform' }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}
```

---

## 3. CSP Security Headers (`next.config.mjs`)

```javascript
/** @type {import('next').NextConfig} */
const csp = "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://*.supabase.co; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self' https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }], formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
}
export default nextConfig
```

---

## 4. Core Web Vitals Guardrails

- **LCP $\le$ 2.5s**: Preload hero images via `<Image priority ... />`, AVIF/WebP enabled.
- **INP $\le$ 200ms**: Defer heavy client components: `const Chart = dynamic(() => import('./Chart'), { ssr: false })`.
- **CLS $\le$ 0.1**: Set explicit `width`/`height` or aspect-ratio wrappers.

---

## 5. Deployment Runbook Pointer

For multi-target launch procedures (Vercel, Lovable, VPS Docker/Nginx/SSL, smoke tests), see `references/checklist-launch.md`.
