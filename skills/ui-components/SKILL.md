---
name: ui-components
description: Universal UI component catalog and design system based on shadcn/ui, Tailwind CSS, and Zinc-950/Indigo palette. Provides copy-pasteable blocks for dashboards, data tables, complex forms, and SaaS landing pages.
---

# UI Components & Design System

Universal frontend design standard and production-ready component block library for Next.js App Router, Tailwind CSS, and shadcn/ui.

---

## 1. Design System Tokens (Zinc-950 / Indigo-500)

All UI elements strictly adhere to the Dark-First Zinc & Indigo visual standard:

| Token Category | Tailwind Class | Hex / Value | Purpose |
|---|---|---|---|
| **App Background** | `bg-zinc-950` | `#09090b` | Root viewport canvas |
| **Surface / Card** | `bg-zinc-900` | `#18181b` | Primary cards, panels, modals |
| **Elevated Surface** | `bg-zinc-900/80 backdrop-blur-md` | `#18181bcc` | Sticky headers, floating toolbars |
| **Subtle Surface** | `bg-zinc-900/50` | `#18181b80` | Secondary wells, table headers |
| **Primary Border** | `border-zinc-800` | `#27272a` | Card & container boundaries |
| **Subtle Border** | `border-zinc-800/60` | `#27272a99` | Inner dividers, separators |
| **Primary Accent** | `bg-indigo-600 hover:bg-indigo-500` | `#4f46e5` / `#6366f1` | Primary CTAs, active highlights |
| **Accent Text** | `text-indigo-400` | `#818cf8` | Active links, metric badges |
| **Focus Ring** | `ring-2 ring-indigo-500/30 ring-offset-2 ring-offset-zinc-950` | — | Keyboard focus accessibility |
| **Text Primary** | `text-zinc-100` | `#f4f4f5` | Main headings, body copy |
| **Text Muted** | `text-zinc-400` | `#a1a1aa` | Labels, descriptions, icons |
| **Text Subtle** | `text-zinc-500` | `#71717a` | Timestamps, placeholders |

### Semantic Status Badges
- **Success**: `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`
- **Warning**: `bg-amber-500/10 text-amber-400 border-amber-500/20`
- **Danger**: `bg-rose-500/10 text-rose-400 border-rose-500/20`
- **Info**: `bg-blue-500/10 text-blue-400 border-blue-500/20`
- **Neutral**: `bg-zinc-800/80 text-zinc-300 border-zinc-700/50`

---

## 2. Mandatory Component Engineering Rules

1. **Server vs. Client Boundaries**: Default all layouts and page structures to React Server Components (RSC). Restrict `'use client'` strictly to interactive leaves (forms, dropdowns, table client state, command dialog).
2. **5 Mandatory Component States**: Every UI component MUST explicitly handle:
   - **Default**: Polished idle visual presentation.
   - **Hover / Focus-Visible**: Clear interactive feedback (`hover:border-zinc-700`, focus ring).
   - **Loading**: Skeleton placeholder (`Skeleton` component with pulse) matching final dimensions.
   - **Error**: Accessible error banner or red border (`border-rose-500`) with assistive text.
   - **Empty**: Illustrated empty state with descriptive heading and actionable CTA button.
3. **Strict TypeScript & Imports**: Zero `any` types. Explicit prop interfaces. Explicit imports from `lucide-react` (never wildcard imports).
4. **Responsive Breakpoints**:
   - `sm` (640px): Full-width mobile drawers, single-column stacks.
   - `md` (768px): 2-column grid adaptation, collapsible sub-menus.
   - `lg` (1024px): Desktop sidebar, multi-column bento grids, sticky sidebars.
   - `xl` (1280px): Extended container views, comprehensive data tables.

---

## 3. Reference Catalog & Intent Router

Read the dedicated reference file for the required UI domain:

| Intent / Task Target | Reference File Path | Key Implementations Included |
|---|---|---|
| **App Shell & Navigation** | `references/dashboard-layout.md` | Collapsible sidebar, mobile drawer Sheet, sticky header, dynamic breadcrumbs, Command Menu (`Cmd+K`), user profile dropdown |
| **Data Tables & Lists** | `references/data-table.md` | TanStack Data Table, search debounce, faceted multi-select filters, column toggle, sortable headers, pagination, batch actions, status badges |
| **Forms & User Inputs** | `references/forms.md` | 2-Column responsive settings cards, multi-step wizard with Zod validation, accessible Radix inputs, file dropzone with preview, Sonner toast feedback |
| **SaaS Landing Pages (Padrão)** | `references/landing-page.md` | Hero with glowing mockup, Bento feature grid, billing toggle pricing cards, FAQ accordion, responsive footer |
| **Cinematic Landing Pages (Luxo & Awwwards)** | `references/cinematic-landing-page.md` | 4 Presets Estéticos (Organic Tech, Midnight Luxe, Brutalist, Vapor Clinic), ruído SVG feTurbulence, Micro-UIs funcionais (Shuffler, Typewriter, Scheduler), manifesto parallax, sticky stacking |

---

## 4. Quick Component CLI Guide

Install required shadcn/ui components when bootstrapping new modules:

```bash
# Layout & Navigation
npx shadcn@latest add sheet dropdown-menu breadcrumb command avatar separator badge

# Data Tables & Cards
npx shadcn@latest add table card popover checkbox select

# Forms & Feedback
npx shadcn@latest add form input textarea switch radio-group progress skeleton sonner
```

---

## 5. Anti-Patterns & Quality Gate

- ❌ NEVER use un-styled native HTML tables or raw unvalidated `<input>` elements.
- ❌ NEVER place `'use client'` on top-level root pages or server layout components.
- ❌ NEVER skip loading skeletons or empty states in asynchronous data views.
- ❌ NEVER hardcode arbitrary colors outside the Zinc/Indigo palette.
- ✅ ALWAYS wrap interactive dialogs and popovers with accessible ARIA labels and trigger keys.
