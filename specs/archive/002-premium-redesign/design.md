# Design System: Mecânica Popular Financeiro v2

## Paleta de Cores (oklch)

```
Background Principal:    oklch(0.13 0.02 264)    /* #080C18 – quase preto azulado */
Surface 1 (cards):       oklch(0.16 0.022 264)   /* painéis glass */
Surface 2 (hover):       oklch(0.19 0.028 265)   
Surface 3 (active):      oklch(0.22 0.035 266)   
Foreground:              oklch(0.96 0.005 248)   /* branco suave */
Muted Foreground:        oklch(0.50 0.03 257)    /* cinza médio */
Primary:                 oklch(0.62 0.19 259)    /* azul elétrico */
Success:                 oklch(0.72 0.18 145)    /* verde limpo */
Warning:                 oklch(0.77 0.17 70)     /* amarelo quente */
Destructive:             oklch(0.64 0.22 25)     /* vermelho vivo */
```

## Glassmorphism System

### Glass Panel (componentes padrão)
```css
.glass-panel {
  background: oklch(0.16 0.022 264 / 60%);
  backdrop-filter: blur(20px) saturate(1.5);
  border: 1px solid oklch(1 0 0 / 6%);
  border-radius: 16px;
}
```

### Glass Panel Elevated (cards interativos — KPI, Store)
```css
.glass-elevated {
  background: oklch(0.16 0.022 264 / 70%);
  backdrop-filter: blur(24px) saturate(1.6);
  border: 1px solid oklch(1 0 0 / 8%);
  border-radius: 16px;
  box-shadow: 
    0 4px 24px oklch(0 0 0 / 20%),
    inset 0 1px 0 oklch(1 0 0 / 4%);
}
```

### Glass Sidebar
```css
.glass-sidebar {
  background: oklch(0.12 0.018 264 / 85%);
  backdrop-filter: blur(32px) saturate(1.8);
  border-right: 1px solid oklch(1 0 0 / 5%);
}
```

## Tipografia

| Uso | Peso | Tamanho | Tracking |
|---|---|---|---|
| KPI valor grande | `font-extrabold` | 28px | `-0.02em` |
| KPI label | `font-medium` | 12px | `0.05em uppercase` |
| Card title | `font-bold` | 14px | `-0.01em` |
| Body text | `font-normal` | 13px | `0` |
| Badge/tag | `font-bold` | 10px | `0.08em uppercase` |
| Section heading | `font-bold` | 20px | `-0.02em` |
| Page heading | `font-bold` | 26px | `-0.025em` |

## Animações (APENAS performáticas)

### Regra de Ouro
- ✅ `opacity` + `transform` (GPU-accelerated)
- ❌ `filter: blur()` em animações (causa jank em mobile)
- ❌ `AnimatePresence mode="wait"` (bloqueia UI)

### Page Transition (CSS puro)
```css
.page-enter {
  animation: pageIn 200ms ease-out;
}
@keyframes pageIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Card Hover
```css
transform: translateY(-2px);
box-shadow: 0 8px 32px oklch(0 0 0 / 30%);
transition: all 200ms ease;
```

### Active Nav Indicator
```css
/* Glow lateral no item ativo da sidebar */
box-shadow: inset 3px 0 0 var(--primary), 
            -4px 0 12px oklch(0.62 0.19 259 / 25%);
```

## Layout Structure

### Desktop (≥768px)
```
┌────────────┬──────────────────────────────────────┐
│  Sidebar   │  Topbar (breadcrumb + search)        │
│  200px     │──────────────────────────────────────│
│  glass     │                                      │
│            │  Content area                         │
│            │  max-w-[1400px] mx-auto              │
│            │  px-8 py-6                           │
│            │                                      │
└────────────┴──────────────────────────────────────┘
```

### Mobile (<768px)
```
┌──────────────────────────┐
│  Top bar (logo + menu)   │
│──────────────────────────│
│                          │
│  Content area            │
│  px-4 py-4 pb-20        │
│                          │
│                          │
│──────────────────────────│
│  Bottom nav (4 items)    │
│  Painel|Concil.|Alertas|+ │
└──────────────────────────┘
```

## Componentes Chave

### KPI Card
- Gradiente sutil de cima-esquerda para baixo-direita (cor do tone → transparente)
- Valor numérico: `text-[28px] font-extrabold tracking-tighter`
- Sparkline: `h-16 opacity-40` (maior e mais legível)
- Ícone no canto: `h-10 w-10` em círculo com glow suave
- Hover: `translateY(-2px)` + shadow expand

### Store Card
- Status bar no topo do card (3px height, cor do status)
- Nome da loja: bold, left-aligned
- Valor: `text-[22px] font-bold`
- Badge de status: pill com border

### Bottom Nav Mobile
- 4 slots: Painel, Conciliação, Alertas, Mais (abre drawer com restante)
- Item ativo: ícone + text primary + dot indicator acima
- Glass background com blur

### Sidebar Desktop
- Logo + "Mecânica Popular" header
- Nav items com `rounded-lg` e padding generoso
- Active: background `primary/12` + left glow bar
- Avatar section no footer com separador
