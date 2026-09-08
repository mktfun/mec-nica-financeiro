---
name: frontend-design-pro
description: Guia de design e implementação de UI premium — padrões visuais, componentes, acessibilidade e micro-animações para o stack React + Tailwind do projeto.
---

# Frontend Design Pro — Guia Operacional para IA

## Identidade Visual do Projeto

**Leia `memory/ui.md` antes de qualquer implementação de componente.**

### Paleta de Cores (Dark UI Obrigatório)
```css
/* Backgrounds */
--bg-base: #050711;          /* Zinc-950 — fundo principal */
--bg-surface: #0f1117;       /* Cards, modais */
--bg-elevated: #1a1d27;      /* Hover states, dropdowns */

/* Texto */
--text-primary: #f4f4f5;     /* Zinc-100 */
--text-secondary: #a1a1aa;   /* Zinc-400 */
--text-muted: #52525b;       /* Zinc-600 */

/* Accent */
--accent-primary: #6366f1;   /* Indigo-500 */
--accent-hover: #4f46e5;     /* Indigo-600 */
```

**❌ PROIBIDO:** glassmorphism (`backdrop-filter: blur`), gradientes excessivos, backgrounds claros

### Tipografia
```css
font-family: 'Inter', 'Outfit', system-ui, sans-serif;
```
Importar sempre via Google Fonts no `layout.tsx` ou global CSS.

## Regras de Componentes React

### 1. Estrutura de Arquivo
```typescript
// Sempre: named export + tipagem explícita
interface MeuComponenteProps {
  title: string
  onAction?: () => void
  className?: string
}

export function MeuComponente({ title, onAction, className }: MeuComponenteProps) {
  return (
    <div className={cn('base-classes', className)}>
      {/* conteúdo */}
    </div>
  )
}
```

### 2. Estados Obrigatórios em Componentes Interativos
Todo botão, formulário ou elemento interativo deve ter:
- **Default state**: aparência normal
- **Hover state**: feedback visual claro (`transition-colors duration-200`)
- **Loading state**: skeleton ou spinner quando dados estão carregando
- **Error state**: mensagem de erro acessível e visível
- **Empty state**: quando não há dados para mostrar

### 3. Micro-animações (Tailwind)
```tsx
// Hover
className="transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"

// Entrada de elemento
className="animate-in fade-in slide-in-from-bottom-2 duration-300"

// Loading skeleton
className="animate-pulse bg-zinc-800 rounded"
```

### 4. Responsividade
- Mobile-first sempre: comece com classes base (mobile) e adicione `md:` e `lg:`
- Breakpoints: `sm:640px` / `md:768px` / `lg:1024px` / `xl:1280px`

## Padrões de Layout

### Card Padrão do Projeto
```tsx
<div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 
                transition-all duration-200 hover:border-zinc-700">
  {/* conteúdo */}
</div>
```

### Modal/Dialog
```tsx
// Usar Radix Dialog ou shadcn/ui Dialog
// Fundo: bg-zinc-950/80 backdrop-blur-sm (o blur é no overlay, não no card)
// Card do modal: bg-zinc-900 border border-zinc-800
```

### Botão Primário
```tsx
<button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 
                   px-4 py-2 text-sm font-medium text-white 
                   transition-colors hover:bg-indigo-500 
                   focus-visible:outline focus-visible:outline-2 
                   focus-visible:outline-indigo-500
                   disabled:opacity-50 disabled:cursor-not-allowed">
  {/* label */}
</button>
```

## Anti-Patterns de UI

| ❌ Proibido | ✅ Correto |
|---|---|
| Glassmorphism no conteúdo principal | Usar no overlay/backdrop apenas |
| Cores hardcoded inline (`style={{ color: '#fff' }}`) | Classes Tailwind ou CSS variables |
| Componente sem estado de loading | Sempre implementar loading/skeleton |
| `any` no TypeScript de props | Tipar explicitamente todas as props |
| Importar ícones pesados inteiros | Tree-shaking: `import { X } from 'lucide-react'` |
| Layout quebrando no mobile | Testar sempre no breakpoint `sm` |

## Checklist Antes de Marcar UI como Concluída

- [ ] Leia `memory/ui.md` — o componente já existe?
- [ ] Dark mode respeitado (Zinc-950 base)
- [ ] Estados de loading, error e empty implementados
- [ ] Responsivo em mobile (sm) e desktop (lg)
- [ ] TypeScript sem `any`
- [ ] Micro-animação de hover presente
- [ ] VLM QA com Playwright executado (ver vibe-apply Step 3)
