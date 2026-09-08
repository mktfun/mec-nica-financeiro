# 05 — shadcn/ui: Setup e Tokens de Design

Para catálogo completo de blocos de UI (Dashboards, Tabelas, Formulários e Landing Pages), consulte `ui-components/SKILL.md`. Para micro-interações e efeitos visuais, consulte `ui-motion/SKILL.md`.

---

## 1. Configuração Tailwind (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
```

---

## 2. Tokens de Design Globais (`src/app/globals.css`) — Zinc-950 Dark Mode First

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 238.7 83.5% 66.7%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 238.7 83.5% 66.7%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;       /* zinc-950 #09090b */
    --foreground: 0 0% 98%;          /* zinc-50 #fafafa */
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 238.7 83.5% 66.7%;    /* indigo-500 #6366f1 */
    --primary-foreground: 0 0% 98%;
    --secondary: 240 3.7% 15.9%;     /* zinc-900 */
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;/* zinc-400 */
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;        /* zinc-800 #27272a */
    --input: 240 3.7% 15.9%;
    --ring: 238.7 83.5% 66.7%;
  }
}

* { @apply border-border; }
body { @apply bg-background text-foreground antialiased; }
```

---

## 3. Utilitário `cn` (`src/lib/utils.ts`)

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 4. Instalação de Blocos de Componentes

```powershell
# Primitivos de formulários e inputs
cmd.exe /c "npx shadcn@latest add form input textarea select checkbox switch label"

# Primitivos de overlay e navegação
cmd.exe /c "npx shadcn@latest add dialog alert-dialog sheet dropdown-menu popover tooltip tabs"

# Primitivos de visualização de dados
cmd.exe /c "npx shadcn@latest add table card badge avatar skeleton progress"
```

---

## 5. Próximos Passos com Skills de UI
- Construa o Shell de Dashboard completo em `ui-components/references/dashboard-layout.md`.
- Construa Data Tables com filtros e busca em `ui-components/references/data-table.md`.
- Adicione Shimmer Buttons e Border Beams com `ui-motion/SKILL.md`.
