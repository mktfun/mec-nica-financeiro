# 002 – Redesign Premium Completo: Mecânica Popular Financeiro

## Problema Atual

O sistema atual tem problemas graves de UX e visual:

1. **Sidebar desktop é pesada** — 220px fixos, estilo flat, sem glassmorphism, sem animaçÁo no item ativo.
2. **NavegaçÁo mobile é lenta** — bottom nav com 5 cols + sheet "Mais", transiçÁo entre páginas demora por causa do `AnimatePresence` com `mode="wait"` + `filter: blur()` (muito pesado em mobile).
3. **KPI Cards sem impacto visual** — sparklines adicionadas mas o card continua parecendo genérico. Falta contraste, falta hierarquia tipográfica.
4. **Store Grid monótono** — todos os cards parecem iguais, badges de status fraquinhos.
5. **AlertsList sem urgência visual** — ping animation no dot mas o painel em si nÁo comunica urgência.
6. **CashInputCard básico** — formulário chato, sem feedback visual.
7. **Páginas internas (conciliacao, patio, alertas, recebiveis, lojas)** — nenhuma recebeu tratamento premium.
8. **Performance** — `AnimatePresence mode="wait"` com blur filter causa jank severo em dispositivos mais fracos.

## VisÁo do Redesign

Inspirado nas referências visuais fornecidas (Peugeot dark-glass app, Travel app, Real-estate minimal app):

### Princípios Visuais
- **Deep Dark Glass**: Background escuro (#0A0E1A), painéis com `backdrop-blur-xl` + `bg-white/5` + `border border-white/8`
- **Gradientes Sutis**: Cards de KPI com gradiente sutil do tom da cor para transparente
- **Tipografia Bold**: Números financeiros em `font-extrabold`, labels em `font-medium uppercase tracking-wider`
- **Cores Neon Controladas**: Glow effects apenas nos indicadores de status, nÁo em texto comum
- **Micro-animações Performáticas**: Apenas `opacity + transform`, SEM `filter: blur()` (causa jank)
- **Mobile-First**: Bottom nav simplificada (4 items, sem "Mais"), sidebar desktop compacta (200px)

## O que JÁ EXISTE e será REUTILIZADO
- TanStack Router + Query (routing e state)
- Shadcn UI components (`sheet`, `dialog`, `tabs`, `button`, `calendar`, etc.)
- Mock data layer (`src/lib/mock/`) — hooks, seed, types
- Lucide React icons
- Recharts (já instalado)
- Framer Motion (já instalado)
- Tailwind CSS v4 com oklch theme vars

## O que precisa ser MODIFICADO (de verdade desta vez)

### Layout & NavegaçÁo
| Componente | Arquivo | Mudança |
|---|---|---|
| AppSidebar | `layout/AppSidebar.tsx` | Rewrite completo: glassmorphism, active indicator com glow lateral, avatar no topo, separadores visuais |
| AppShell | `layout/AppShell.tsx` | Remover AnimatePresence (causa lentidÁo), mobile nav simplificada sem sheet "Mais", transições CSS puras |
| Topbar | `layout/Topbar.tsx` | Search bar funcional com Cmd+K, glassmorphism |

### Dashboard (index.tsx)
| Componente | Arquivo | Mudança |
|---|---|---|
| KpiCard | `dashboard/KpiCard.tsx` | Gradiente de fundo, tipografia mais bold, sparkline maior e mais visível |
| StatusBanner | `dashboard/StatusBanner.tsx` | Simplificar animaçÁo (remover spring complexo) |
| StoreCard | `dashboard/StoreCard.tsx` | Card redesign com progress bar para status |
| AlertsList | `dashboard/AlertsList.tsx` | Remover ping animation (performance), usar left border color + hover highlight |
| CashInputCard | `dashboard/CashInputCard.tsx` | Input com formataçÁo automática R$, feedback visual ao salvar |

### Styles
| Arquivo | Mudança |
|---|---|
| `styles.css` | Novo background mais escuro, glass utilities melhoradas, custom scrollbar, selection color |

## Critérios de Aceite
1. ✅ Build sem erros (`npm run build` exit code 0)
2. ✅ NavegaçÁo entre páginas instantânea (sem delay de blur/filter)
3. ✅ Sidebar desktop com visual glassmorphism e indicador ativo brilhante
4. ✅ Bottom nav mobile com 4 itens, sem sheet "Mais"
5. ✅ KPI cards com gradientes e tipografia premium
6. ✅ Store grid com visual diferenciado por status
7. ✅ Alertas com urgência visual clara mas sem animações pesadas
8. ✅ CashInputCard com formataçÁo R$ automática
9. ✅ Todas as páginas usando glass panels consistentes
