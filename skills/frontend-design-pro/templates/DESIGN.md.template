# 📐 DESIGN.md — Design System Specification

Este arquivo é a fonte de verdade visual absoluta do projeto. Qualquer código gerado por IA DEVE aderir estritamente aos tokens, escalas e restrições aqui declarados. É terminantemente proibido utilizar classes utilitárias arbitrárias fora desta especificação.

---

## 1. Palette & Surface Tokens (Dark-First Zinc-950)

| Token Semântico | Tailwind Class | Hex Value | Finalidade |
|---|---|---|---|
| `bg-canvas` | `bg-zinc-950` | `#09090b` | Viewport de fundo principal da aplicação |
| `bg-surface` | `bg-zinc-900` | `#18181b` | Cards primários, painéis, modais |
| `bg-elevated` | `bg-zinc-900/80 backdrop-blur-md` | `#18181bcc` | Headers fixos, docks, barras flutuantes |
| `bg-subtle` | `bg-zinc-900/40` | `#18181b66` | Linhas de tabela pares, áreas secundárias |
| `border-base` | `border-white/10` ou `border-zinc-800` | `#27272a` | Borda delimitadora primária de cards |
| `border-subtle` | `border-white/5` ou `border-zinc-800/60`| `#27272a99` | Divisores internos, separadores de linha |
| `accent-primary` | `bg-indigo-600 hover:bg-indigo-500` | `#4f46e5` | Botões primários de ação, call-to-action |
| `accent-subtle` | `text-indigo-400` | `#818cf8` | Links ativos, ícones de status aceso |
| `focus-ring` | `ring-2 ring-indigo-500/40 ring-offset-2 ring-offset-zinc-950` | — | Indicador de foco acessível para teclado |

### Feedback Semântico:
- **Sucesso**: `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`
- **Aviso**: `bg-amber-500/10 text-amber-400 border border-amber-500/20`
- **Perigo / Erro**: `bg-rose-500/10 text-rose-400 border border-rose-500/20`
- **Info**: `bg-blue-500/10 text-blue-400 border border-blue-500/20`

---

## 2. Typography Scale & Font Rules

- **Família Tipográfica Primária**: `'Inter', 'Outfit', system-ui, sans-serif`
- **Font-Smoothing**: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`
- **Text-Rendering**: `optimizeLegibility`

| Nível | Tailwind Class | Tamanho / Line-Height | Peso | Uso |
|---|---|---|---|---|
| **Display / Hero** | `text-4xl sm:text-5xl font-semibold tracking-tight` | 36px / 48px | 600 | Título principal de landing page |
| **Heading 1 (H1)** | `text-2xl sm:text-3xl font-semibold tracking-tight` | 24px / 30px | 600 | Título principal de página/dashboard |
| **Heading 2 (H2)** | `text-lg sm:text-xl font-medium tracking-normal` | 18px / 24px | 500 | Título de card, cabeçalho de seção |
| **Body (Padrão)** | `text-sm sm:text-base font-normal text-zinc-300 leading-relaxed` | 14px / 16px | 400 | Texto de leitura corrido, tabelas |
| **Small / Metadata**| `text-xs font-normal text-zinc-400` | 12px | 400 | Timestamps, tags, legendas |
| **Input (Mobile)** | `text-base md:text-sm text-zinc-100` | ≥ 16px (mobile) | 400 | Campos de formulário (anti-zoom iOS) |

---

## 3. Corner Radius Scale (Escala de Bordas)

- **sm**: `rounded-md` (6px) — Badges, tags, botões pequenos
- **md**: `rounded-lg` (8px) — Inputs, botões primários
- **lg**: `rounded-xl` (12px) — Cards principais, caixas de diálogo pequenas
- **xl**: `rounded-2xl` (16px) — Modais principais, painéis amplos
- **Fórmula de Aninhamento Obrigatória**: $R_{\text{filho}} = R_{\text{pai}} - \text{padding}$

---

## 4. Spacing Rhythm (Grade de 4px / 8px)

Utilizar múltiplos estritos da escala Tailwind:
- `p-1` (4px), `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-6` (24px), `p-8` (32px), `p-12` (48px)
- Proibido usar valores arbitrários (ex.: `p-[15px]`, `gap-[21px]`).

---

## 5. Negative Constraints (Anti-Slop Hard Limits)

1. ❌ **PROIBIDO** fundo `#000000` puro sem elevação de superfícies.
2. ❌ **PROIBIDO** gradientes roxos/azuis arbitrários em botões ou títulos (`purple-violet-gradient`).
3. ❌ **PROIBIDO** cards dentro de outros cards sem redução de elevação (`cardocalypse`).
4. ❌ **PROIBIDO** alterar `font-weight` no hover (previne layout shift).
5. ❌ **PROIBIDO** animações de micro-interação acima de 200ms.
6. ❌ **PROIBIDO** inputs com fonte menor que 16px no mobile.
7. ❌ **PROIBIDO** emojis como ícones de botões ou navegação.
8. ❌ **PROIBIDO** criar componentes interativos do zero sem buscar referência no **Shoogle** (`shoogle.dev`).
